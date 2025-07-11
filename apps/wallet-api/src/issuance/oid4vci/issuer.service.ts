import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import {
  AccessToken,
  ClaimDescription,
  convertJsonSchemaToClaimDescriptions,
  CredentialFormat,
  CredentialIssuerMetadata,
  CredentialRequest,
  CredentialResponse,
  NonceResponse
} from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { Repository } from "typeorm";

import { InitCredentialConfig, RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { IssueConfigurationService } from "../../issue-configurations/issue-configuration.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { CIAccessToken, CredentialIssuance } from "../../model/issuance.dao.js";

@Injectable()
export class OID4VCIIssuerService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(CredentialIssuance)
    private readonly issuanceRepository: Repository<CredentialIssuance>,
    @InjectRepository(CIAccessToken)
    private readonly tokenRepository: Repository<CIAccessToken>,
    private readonly issueConfigurationService: IssueConfigurationService,
    private readonly credentialService: CredentialsService,
    private readonly signatureService: SignatureService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private readonly nonceCache = new Map<string, number>();

  @Interval(60 * 1000)
  cleanupNonceCache() {
    const now = Date.now();
    for (const [nonce, exp] of this.nonceCache.entries()) {
      if (exp < now) this.nonceCache.delete(nonce);
    }
  }

  async issuerMetadata(): Promise<CredentialIssuerMetadata> {
    const publicEndpoint = `${this.config.server.publicAddress}${process.env["EMBEDDED_FRONTEND"] ? "/api" : ""}`;
    const issuerMetadata: CredentialIssuerMetadata = {
      credential_issuer: `https://${this.config.server.publicDomain}`,
      credential_endpoint: `${publicEndpoint}/oid4vci/credential`,
      token_endpoint: `${publicEndpoint}/oid4vci/token`,
      nonce_endpoint: `${publicEndpoint}/oid4vci/nonce`,
      display: [
        {
          name: this.config.runtime?.title ?? "TNO Security Gateway",
          locale: "en-US",
          logo: {
            uri:
              this.config.runtime?.lightThemeUrl ??
              `https://${this.config.server.publicDomain}/layout/images/logo-white.svg`
          }
        }
      ],
      credential_configurations_supported: {}
    };
    const issueConfigs =
      await this.issueConfigurationService.getIssueConfigurations();
    issueConfigs.forEach((issueConfig) => {
      let claims: ClaimDescription[] | undefined = undefined;
      if (issueConfig.schema) {
        claims = convertJsonSchemaToClaimDescriptions(issueConfig.schema, []);
      }
      issuerMetadata.credential_configurations_supported[
        issueConfig.credentialType
      ] = {
        format: CredentialFormat.JWT_VC_JSON_LD,
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          issueConfig.documentUrl ??
            `${publicEndpoint}/issue-configuration/${issueConfig.id}`
        ],
        cryptographic_binding_methods_supported: ["did:tdw", "did:web"],
        credential_signing_alg_values_supported: ["EdDSA", "ES384", "PS256"],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ["EdDSA", "ES384", "PS256"]
          }
        },
        credential_definition: {
          type: ["VerifiableCredential", issueConfig.credentialType],
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            issueConfig.documentUrl ??
              `${publicEndpoint}/issue-configuration/${issueConfig.id}`
          ]
        },
        credential_metadata: {
          display: [
            {
              name: issueConfig.name ?? issueConfig.credentialType,
              description: issueConfig.description,
              background_color: issueConfig.backgroundColor,
              background_image: {
                uri: `${publicEndpoint}/issue-configuration/${issueConfig.id}/background-image`
              },
              text_color: issueConfig.textColor
            }
          ],
          claims: claims
        }
      };
    });
    return issuerMetadata;
  }

  async createNonce(): Promise<NonceResponse> {
    const nonce = crypto.randomBytes(48).toString("hex");
    this.nonceCache.set(nonce, Date.now() + 60 * 1000);
    return {
      c_nonce: nonce
    };
  }

  async createAccessToken(preAuthorizedCode: string): Promise<AccessToken> {
    if (!preAuthorizedCode) {
      throw new AppError(
        "No pre-authorized code provided",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    const issuance = await this.issuanceRepository.findOneBy({
      preAuthorizedCode: preAuthorizedCode
    });
    if (!issuance) {
      throw new AppError(
        "No credential issuance flow found",
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + 86400);
    const token = await this.tokenRepository.save({
      access_token: crypto.randomBytes(48).toString("hex"),
      expires_at: expirationDate,
      refresh_token: crypto.randomBytes(48).toString("hex"),
      issuance: issuance
    });
    return {
      access_token: token.access_token,
      token_type: "bearer",
      expires_in: 86400,
      refresh_token: token.refresh_token,
      authorization_details: [
        {
          type: "openid_credential",
          credential_configuration_id: issuance.credentialType,
          credential_identifiers: [issuance.credentialType]
        }
      ]
    };
  }

  async handleCredentialRequest(
    authorizationHeader: string | undefined,
    credentialRequest: CredentialRequest
  ): Promise<CredentialResponse> {
    try {
      if (!authorizationHeader?.startsWith("Bearer ")) {
        throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
      }
      const access_token = authorizationHeader.split(" ")[1];
      const token = await this.tokenRepository.findOneBy({
        access_token: access_token
      });
      if (!token) {
        throw new AppError("Token not recognized", HttpStatus.UNAUTHORIZED);
      }
      const issuance = token.issuance;

      const jwtProof = credentialRequest.proofs?.find(
        (p) => p.proof_type === "jwt"
      );
      if (!jwtProof) {
        throw new AppError(
          "No JWT proof provided in credential request. Only jwt proof types are supported at this moment",
          HttpStatus.BAD_REQUEST
        );
      }

      const parsedJwtHeader = decodeProtectedHeader(jwtProof.jwt);
      if (!parsedJwtHeader.kid) {
        throw new AppError(
          'Only JWTs with "kid" referencing a key described in a DID document are supported',
          HttpStatus.BAD_REQUEST
        );
      }
      if (!issuance.holderId) {
        issuance.holderId = parsedJwtHeader.kid.split("#")[0];
        issuance.credentialSubject.id = issuance.holderId;

        if (!issuance.holderId.startsWith("did:")) {
          throw new AppError(
            `Holder ID ${issuance.holderId} does not start with "did:"`,
            HttpStatus.BAD_REQUEST
          );
        }
      }
      const holderDid = await resolveDid(issuance.holderId);

      const usedJwk = holderDid.verificationMethod?.find(
        (m) => m.id === parsedJwtHeader.kid
      );
      if (!usedJwk || !usedJwk.publicKeyJwk) {
        throw new AppError(
          `Could not find publicKeyJwk for ${parsedJwtHeader.kid} in DID document`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
      const key = await importJWK(usedJwk.publicKeyJwk, parsedJwtHeader.alg);
      const verifiedJwt = await jwtVerify(jwtProof.jwt, key);

      const expectedIssuer =
        this.config.server.publicDomain === "localhost"
          ? `http://localhost:${this.config.server.port}`
          : `https://${this.config.server.publicDomain}`;
      if (verifiedJwt.payload.aud !== expectedIssuer) {
        throw new AppError(
          `Audience in proof JWT does not match credential_issuer (${verifiedJwt.payload.aud} vs ${expectedIssuer}`,
          HttpStatus.BAD_REQUEST
        );
      }

      const nonce = verifiedJwt.payload.nonce;
      if (typeof nonce !== "string" || !this.nonceCache.has(nonce)) {
        throw new AppError(
          "Nonce in JWT proof is invalid or expired",
          HttpStatus.BAD_REQUEST
        );
      }
      this.nonceCache.delete(nonce);

      const issueConfig =
        await this.issueConfigurationService.getIssueConfigurationByType(
          issuance.credentialType
        );

      const credentialConfig = plainToInstance(InitCredentialConfig, {
        context: [
          issueConfig.documentUrl ??
            `${this.config.server.publicAddress}/api/issue-configuration/${issueConfig.id}`
        ],
        type: [issuance.credentialType],
        id: `${issuance.holderId}#${crypto.randomUUID()}`,
        credentialSubject: issuance.credentialSubject
      });
      const credential = await this.credentialService.issueCredential(
        credentialConfig,
        issuance.holderId
      );

      const credentialJwt = await this.signatureService.signAsJwt(
        {
          vc: credential.credential
        },
        undefined,
        {
          jti: credential.id,
          subject: issuance.holderId
        }
      );

      await this.issuanceRepository.save({
        ...issuance,
        credentialId: credential.id
      });
      return {
        credentials: [
          {
            credential: credentialJwt
          }
        ]
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error.andLog(this.logger);
      } else {
        throw new AppError(
          `${error}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
          error
        ).andLog(this.logger);
      }
    }
  }
}
