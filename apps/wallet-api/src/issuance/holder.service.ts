import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CredentialsService } from "../credentials/credentials.service.js";
import {
  AccessToken,
  CredentialDefinition,
  CredentialIssuerMetadata,
  CredentialRequest,
  CredentialResponse,
  OfferGrants,
} from "@libs/wallet-dtos";
import axios from "axios";
import { AppError } from "../utils/error.js";
import qs from "querystring";
import { KeysService } from "../keys/keys.service.js";
import { SignJWT, decodeJwt, importJWK } from "jose";
import { DidService } from "../did/did.service.js";
import { PresentationService } from "../presentation/presentation.service.js";
import { VerifiablePresentation } from "@tsg-dsp/common";
import { plainToInstance } from "class-transformer";
import { toArray } from "../utils/unions.js";
import { RootConfig } from "../config.js";
import { Credentials } from "../model/credentials.dao.js";
import { signingAlgorithm } from "../utils/keymapping.js";

@Injectable()
export class HolderService {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly presentationService: PresentationService,
    private readonly keysService: KeysService,
    private readonly didService: DidService,
    private readonly config: RootConfig
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  initialized: Promise<boolean>;
  async init() {
    this.logger.log("Initializing HolderService");
    const existingCredentials = await this.credentialsService.getCredentials();
    await Promise.all(
      this.config.oid4vci.holder.map(async (holderConfig) => {
        if (
          existingCredentials.find((c) =>
            c.credential.type.includes(holderConfig.credentialType)
          )
        ) {
          this.logger.log(
            `Already holding ${holderConfig.credentialType} credential, skipping request`
          );
        } else {
          await this.requestCredentialWithRetry(
            holderConfig.preAuthorizationCode,
            holderConfig.issuerUrl
          );
        }
      })
    );

    return true;
  }

  async requestCredentialWithRetry(
    preAuthorizedCode: string,
    issuerUrl: string,
    retry = 0
  ) {
    try {
      await this.requestCredential(preAuthorizedCode, issuerUrl);
    } catch (err) {
      if (retry < 5) {
        this.logger.warn(
          `Could not request credential with code ${preAuthorizedCode} at ${issuerUrl}, retrying in 10 seconds`
        );
        await new Promise((f) => setTimeout(f, 10000));
        await this.requestCredentialWithRetry(
          preAuthorizedCode,
          issuerUrl,
          ++retry
        );
      } else {
        this.logger.error(
          `Could not request credential with code ${preAuthorizedCode} at ${issuerUrl}: ${err}`
        );
        throw err;
      }
    }
  }

  async requestCredential(
    preAuthorizedCode: string,
    issuerUrl: string
  ): Promise<Credentials> {
    const issuerMetadata = await this.retrieveIssuerMetadata(issuerUrl);
    const accessToken = await this.requestAccessToken(
      preAuthorizedCode,
      issuerMetadata.token_endpoint!
    );
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
      issuerUrl,
      credentialConfig.credential_definition
    );

    const credentialResponse = await this.invokeCredentialEndpoint(
      issuerMetadata.credential_endpoint,
      credentialRequest,
      accessToken.access_token
    );

    if ("credential" in credentialResponse) {
      const presentationCheck =
        await this.presentationService.validatePresentation({
          vp: credentialResponse.credential,
        });
      if (!presentationCheck.valid) {
        this.logger.warn(
          `Verifiable presentation token from issuer ${issuerUrl} not valid, credential will be added but might not be valid:\n${JSON.stringify(
            presentationCheck,
            null,
            2
          )}`
        );
      }
      const jwtPayload = decodeJwt(credentialResponse.credential);
      const vp = plainToInstance(VerifiablePresentation, jwtPayload.vp);
      this.logger.log(
        `Importing credential ${toArray(vp.verifiableCredential)[0].id}`
      );
      return this.credentialsService.importCredential(
        toArray(vp.verifiableCredential)[0]
      );
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
            const tokenEndpoint = await this.retrieveTokenEndpoint(
              authorizationServer
            );
            if (tokenEndpoint) {
              return {
                ...response.data,
                token_endpoint: tokenEndpoint,
              };
            }
          }
        }
        const tokenEndpoint = await this.retrieveTokenEndpoint(issuerUrl);
        if (tokenEndpoint) {
          return {
            ...response.data,
            token_endpoint: tokenEndpoint,
          };
        } else {
          throw new AppError(
            `Could not find token endpoint for ${issuerUrl}`,
            HttpStatus.BAD_REQUEST
          ).andLog(this.logger);
        }
      }

      return response.data;
    } catch (err) {
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
    } catch (err) {
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
          grant_type: OfferGrants.PRE_AUTHORIZATION_CODE,
          "pre-authorized_code": preAuthorizedCode,
        })
      );
      return tokenResponse.data;
    } catch (err) {
      throw new AppError(
        `Could not retrieve access token for pre authorization code ${preAuthorizedCode} at ${tokenEndpoint}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  private async generateCredentialRequest(
    nonce: string | undefined,
    issuerUrl: string,
    credentialDefinition: CredentialDefinition
  ): Promise<CredentialRequest> {
    const key = await this.keysService.getDefaultKey();

    const jwt = await new SignJWT({ nonce: nonce })
      .setProtectedHeader({
        alg: signingAlgorithm(key.type),
        typ: "openid4vci-proof+jwt",
        kid: `${await this.didService.getDidId()}#${key.id}`,
      })
      .setIssuer(await this.didService.getDidId())
      .setAudience(issuerUrl)
      .setIssuedAt()
      .sign(await importJWK(key.privateKey));

    return {
      format: "jwt_vc_json-ld",
      credential_definition: credentialDefinition,
      proof: {
        proof_type: "jwt",
        jwt: jwt,
      },
    };
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
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (err) {
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
