import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import { validateJwt } from "@tsg-dsp/common-signing-and-validation";
import {
  AccessToken,
  CredentialConfiguration,
  CredentialIssuerMetadata,
  CredentialRequest,
  CredentialResponse,
  OfferGrants,
  OID4VCICredentialRequestInitiation
} from "@tsg-dsp/wallet-dtos";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";
import qs from "querystring";

import { OID4VCIHolderConfig, RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { CredentialDao } from "../../model/credentials.dao.js";

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
    await Promise.all(
      this.config.issuance.oid4vci.map(async (holderConfig) => {
        if (
          holderConfig.credentialType.every((type) =>
            existingTypes.includes(type)
          )
        ) {
          this.logger.log(
            `Already holding ${holderConfig.credentialType.join(", ")} credential(s), skipping request`
          );
        } else {
          await this.requestCredentialWithRetry(holderConfig);
        }
      })
    );

    return true;
  }

  async requestCredentialWithRetry(
    config: OID4VCIHolderConfig,
    retry = 0,
    backOff = 1000
  ) {
    try {
      await this.requestCredential(config);
    } catch (err) {
      if (retry < 5) {
        this.logger.warn(
          `Could not request credential with code ${config.preAuthorizedCode} at ${config.issuerUrl}, retrying in 10 seconds`
        );
        await new Promise((f) => setTimeout(f, backOff));
        await this.requestCredentialWithRetry(config, ++retry, backOff * 2);
      } else {
        this.logger.error(
          `Could not request credential with code ${config.preAuthorizedCode} at ${config.issuerUrl}: ${err}`
        );
        throw err;
      }
    }
  }

  async requestCredential(
    config: OID4VCICredentialRequestInitiation
  ): Promise<CredentialDao> {
    const issuerMetadata = await this.retrieveIssuerMetadata(config.issuerUrl);
    let accessToken: AccessToken;
    if (config.authorized) {
      accessToken = {
        access_token: config.authorized.accessToken,
        c_nonce: crypto.randomBytes(48).toString("hex"),
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
    const credentialIdentifier =
      accessToken.authorization_details?.[0]?.credential_identifiers?.[0];
    if (!credentialIdentifier) {
      throw new AppError(
        "Access token does not contain authorization details or credential identifier",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const credentialConfig =
      issuerMetadata.credential_configurations_supported[credentialIdentifier];
    if (!credentialConfig) {
      throw new AppError(
        `Credential configuration for ${accessToken.authorization_details?.[0]?.credential_identifiers?.[0]} not found`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const credentialRequest = await this.generateCredentialRequest(
      accessToken.c_nonce,
      config.issuerUrl,
      credentialConfig,
      config.authorized?.credentialIdentifier,
      config.authorized?.additionalRequestParams
    );

    const credentialResponse = await this.invokeCredentialEndpoint(
      issuerMetadata.credential_endpoint,
      credentialRequest,
      accessToken.access_token
    );

    if ("credential" in credentialResponse) {
      this.logger.debug(
        `Received credential as string, attempting to parse as JWT`
      );
      const payload = await validateJwt(credentialResponse.credential);
      if (payload.vc) {
        this.logger.debug(
          `Received credential as JWT, parsing as VerifiableCredential`
        );
        return this.credentialsService.importCredential(
          plainToInstance(VerifiableCredential, payload.vc)
        );
      }
      this.logger.debug(`JWT payload: ${JSON.stringify(payload, null, 2)}`);
      throw new AppError(
        "Non parseable credential response",
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    } else {
      throw new AppError(
        "Deferred credential handling not yet supported",
        HttpStatus.NOT_IMPLEMENTED
      ).andLog(this.logger);
    }
  }

  private async retrieveIssuerMetadata(
    issuerUrl: string
  ): Promise<CredentialIssuerMetadata> {
    const credentialIssuerMetadataEndpoint = this.constructWellKnown(
      "issuer",
      issuerUrl
    );
    try {
      const response = await axios.get<CredentialIssuerMetadata>(
        credentialIssuerMetadataEndpoint
      );

      if (!response.data.token_endpoint) {
        if (response.data.authorization_servers) {
          for (const authorizationServer of response.data
            .authorization_servers) {
            const tokenEndpoint =
              await this.retrieveTokenEndpoint(authorizationServer);
            if (tokenEndpoint) {
              return {
                ...response.data,
                token_endpoint: tokenEndpoint
              };
            }
          }
        }
        const tokenEndpoint = await this.retrieveTokenEndpoint(issuerUrl);
        if (tokenEndpoint) {
          return {
            ...response.data,
            token_endpoint: tokenEndpoint
          };
        } else {
          throw new AppError(
            `Could not find token endpoint for ${issuerUrl}`,
            HttpStatus.BAD_REQUEST
          ).andLog(this.logger);
        }
      }

      return response.data;
    } catch (_) {
      throw new AppError(
        `Could not load OpenID Credential issuer metadata from ${credentialIssuerMetadataEndpoint}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  private async retrieveTokenEndpoint(
    authorizationServer: string
  ): Promise<string | undefined> {
    const openIdMetadataEndpoint = this.constructWellKnown(
      "openid",
      authorizationServer
    );
    const oauthMetadataEndpoint = this.constructWellKnown(
      "oauth",
      authorizationServer
    );
    try {
      const response = await axios.get(openIdMetadataEndpoint);
      if (response.data.token_endpoint) {
        return response.data.token_endpoint as string;
      } else {
        const response = await axios.get(oauthMetadataEndpoint);
        if (response.data.token_endpoint) {
          return response.data.token_endpoint as string;
        } else {
          return undefined;
        }
      }
    } catch (_) {
      return undefined;
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
    credentialConfiguration: CredentialConfiguration,
    credentialIdentifier?: string,
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
      credentialConfiguration.format !== "jwt_vc_json" &&
      credentialConfiguration.format !== "jwt_vc_json-ld"
    ) {
      throw new AppError(
        `Unsupported credential format: ${credentialConfiguration.format}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const response: CredentialRequest = {
      format: credentialConfiguration.format,
      credential_definition: credentialConfiguration.credential_definition,
      proof: {
        proof_type: "jwt",
        jwt: jwt
      }
    };
    if (credentialIdentifier) {
      response.credential_identifier = credentialIdentifier;
    }
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
      if (axios.isAxiosError(error)) {
        this.logger.error(error.response?.data);
      }
      throw new AppError(
        `Error in requesting credential at ${credentialEndpoint}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  private constructWellKnown(
    type: "issuer" | "openid" | "oauth",
    baseUrl: string
  ) {
    let url: string;
    switch (type) {
      case "issuer":
        url = `${baseUrl}/.well-known/openid-credential-issuer`;
        break;
      case "openid":
        url = `${baseUrl}/.well-known/openid-configuration`;
        break;
      case "oauth":
        url = `${baseUrl}/.well-known/oauth-authorization-server`;
        break;
    }
    return url.replace(/([^:])(\/\/+)/g, "$1/");
  }
}
