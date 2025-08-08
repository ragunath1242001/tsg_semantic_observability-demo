import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError, parseNetworkError, promiseMap } from "@tsg-dsp/common-api";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  AccessToken,
  CredentialConfiguration,
  CredentialFormat,
  CredentialRequest,
  CredentialResponse,
  NonceResponse,
  OfferGrants,
  OID4VCICredentialRequestInitiation,
  ProofType
} from "@tsg-dsp/wallet-dtos";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import qs from "querystring";

import { RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { CredentialDao } from "../../model/credentials.dao.js";
import { retrieveOpenIDIssuerMetadata } from "../../utils/openid-metadata.js";
import { retry } from "../../utils/retry.js";

@Injectable()
export class OID4VCIHolderService {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly config: RootConfig
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  initialized: Promise<boolean>;
  async init() {
    this.logger.log("Initializing HolderService");
    const existingCredentials = await this.credentialsService.getCredentials();
    const existingTypes = existingCredentials.flatMap((c) => c.credential.type);
    await promiseMap(this.config.issuance.oid4vci, (config) =>
      retry(
        async () => {
          if (
            config.credentialType.every((type) => existingTypes.includes(type))
          ) {
            this.logger.log(
              `Already holding ${config.credentialType.join(", ")} credential(s), skipping request`
            );
          } else {
            await this.requestCredential(config);
          }
        },
        `request credential for ${config.credentialType.join(", ")}`
      )
    );
    return true;
  }

  async requestCredential(
    config: OID4VCICredentialRequestInitiation
  ): Promise<CredentialDao[]> {
    const issuerMetadata = await retrieveOpenIDIssuerMetadata(config.issuerUrl);
    let accessToken: AccessToken;
    if (config.authorized) {
      accessToken = {
        access_token: config.authorized.accessToken,
        authorization_details: [
          {
            type: "openid_credential",
            credential_configuration_id: config.authorized.credentialIdentifier,
            credential_identifiers: [config.authorized.credentialIdentifier]
          }
        ]
      };
    } else if (config.preAuthorizedCode) {
      accessToken = await this.requestAccessToken(
        config.preAuthorizedCode,
        issuerMetadata.token_endpoint!
      );
    } else {
      throw new AppError(
        "Either pre-authorized code or access token must be provided",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    const credentialConfigurationId =
      accessToken.authorization_details?.[0]?.credential_configuration_id;
    const credentialIdentifier =
      accessToken.authorization_details?.[0]?.credential_identifiers?.[0];
    if (!credentialIdentifier || !credentialConfigurationId) {
      throw new AppError(
        "Access token does not contain authorization details or credential identifier",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const credentialConfig =
      issuerMetadata.credential_configurations_supported[
        credentialConfigurationId
      ];
    if (!credentialConfig) {
      throw new AppError(
        `Credential configuration for ${credentialConfigurationId} not found`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    let nonce: string | undefined;
    if (issuerMetadata.nonce_endpoint) {
      try {
        const nonceResponse = await axios.post<NonceResponse>(
          issuerMetadata.nonce_endpoint
        );
        nonce = nonceResponse.data.c_nonce;
      } catch (_error) {
        this.logger.warn(
          `Could not retrieve nonce from ${issuerMetadata.nonce_endpoint}, proceeding without nonce`
        );
      }
    }

    const credentialRequest = await this.generateCredentialRequest(
      nonce,
      config.issuerUrl,
      credentialConfig,
      credentialIdentifier,
      config.authorized?.additionalRequestParams
    );

    const credentialResponse = await this.invokeCredentialEndpoint(
      issuerMetadata.credential_endpoint,
      credentialRequest,
      accessToken.access_token
    );
    if ("credentials" in credentialResponse) {
      return await Promise.all(
        credentialResponse.credentials.map(async (credentialItem) => {
          if (typeof credentialItem.credential === "string") {
            return this.credentialsService.importCredential(
              credentialItem.credential
            );
          } else {
            return this.credentialsService.importCredential(
              plainToInstance(VerifiableCredential, credentialItem.credential)
            );
          }
        })
      );
    } else {
      throw new AppError(
        "Deferred credential handling not yet supported",
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    }
  }

  private async requestAccessToken(
    preAuthorizedCode: string,
    tokenEndpoint: string
  ): Promise<AccessToken> {
    try {
      const tokenResponse = await axios.post<AccessToken>(
        tokenEndpoint,
        qs.stringify({
          grant_type: OfferGrants.PRE_AUTHORIZED_CODE,
          "pre-authorized_code": preAuthorizedCode
        })
      );
      return tokenResponse.data;
    } catch (_) {
      throw new AppError(
        `Could not retrieve access token for pre authorization code ${preAuthorizedCode} at ${tokenEndpoint}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  private async generateCredentialRequest(
    nonce: string | undefined,
    issuerUrl: string,
    issueConfiguration: CredentialConfiguration,
    credentialIdentifier: string,
    additionalRequestParams?: { [key: string]: any }
  ): Promise<CredentialRequest> {
    const jwt = await this.signatureService.signAsJwt(
      { nonce: nonce },
      issuerUrl,
      {
        typ: "openid4vci-proof+jwt",
        subject: false,
        jti: false
      }
    );
    if (
      issueConfiguration.format !== CredentialFormat.JWT_VC_JSON &&
      issueConfiguration.format !== CredentialFormat.JWT_VC_JSON_LD &&
      issueConfiguration.format !== CredentialFormat.LDP_VC
    ) {
      throw new AppError(
        `Unsupported credential format: ${issueConfiguration.format}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const response: CredentialRequest & { [key: string]: any } = {
      credential_identifier: credentialIdentifier,
      proofs: [
        {
          proof_type: ProofType.JWT,
          jwt: jwt
        }
      ]
    };
    if (additionalRequestParams) {
      Object.entries(additionalRequestParams).forEach(([key, value]) => {
        response[key] = value;
      });
    }
    this.logger.debug(
      `Credential request: ${JSON.stringify(response, null, 2)}`
    );
    return response;
  }

  private async invokeCredentialEndpoint(
    credentialEndpoint: string,
    credentialRequest: CredentialRequest,
    accessToken: string
  ): Promise<CredentialResponse> {
    try {
      const response = await axios.post<CredentialResponse>(
        credentialEndpoint,
        credentialRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      this.logger.debug(
        `Credential response: ${JSON.stringify(response.data)}`
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `requesting credential at ${credentialEndpoint}`
      );
    }
  }
}
