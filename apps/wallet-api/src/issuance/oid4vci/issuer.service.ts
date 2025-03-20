import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import {
  AccessToken,
  CredentialIssuerMetadata,
  CredentialRequest,
  CredentialResponse
} from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import crypto from "crypto";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { Repository } from "typeorm";

import { InitCredentialConfig, RootConfig } from "../../config.js";
import { ContextService } from "../../contexts/context.service.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
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
    private readonly contextService: ContextService,
    private readonly credentialService: CredentialsService,
    private readonly signatureService: SignatureService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async issuerMetadata(): Promise<CredentialIssuerMetadata> {
    const issuerMetadata: CredentialIssuerMetadata = {
      credential_issuer: `https://${this.config.server.publicDomain}`,
      credential_endpoint: `${this.config.server.publicAddress}/api/oid4vci/credential`,
      token_endpoint: `${this.config.server.publicAddress}/api/oid4vci/token`,
      credential_configurations_supported: {}
    };
    const contexts = await this.contextService.getContexts();
    contexts
      .filter((context) => context.issuable)
      .forEach((context) => {
        issuerMetadata.credential_configurations_supported[
          context.credentialType
        ] = {
          format: "jwt_vc_json-ld",
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            context.documentUrl ??
              `${this.config.server.publicAddress}/api/context/${context.id}`
          ],
          cryptographic_binding_methods_supported: ["did:tdw", "did:web"],
          credential_signing_alg_values_supported: ["EdDSA", "ES384", "PS256"],
          proof_types_supported: {
            jwt: {
              proof_signing_alg_values_supported: ["EdDSA", "ES384", "PS256"]
            }
          },
          credential_definition: {
            type: ["VerifiableCredential", context.credentialType],
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              context.documentUrl ??
                `${this.config.server.publicAddress}/api/context/${context.id}`
            ]
          }
        };
      });
    return issuerMetadata;
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
      nonce: crypto.randomBytes(48).toString("hex"),
      issuance: issuance
    });
    return {
      access_token: token.access_token,
      token_type: "bearer",
      expires_in: 86400,
      refresh_token: token.refresh_token,
      c_nonce: token.nonce,
      c_nonce_expires_in: 86400,
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
    access_token: string,
    credentialRequest: CredentialRequest
  ): Promise<CredentialResponse> {
    try {
      const token = await this.tokenRepository.findOneBy({
        access_token: access_token
      });
      if (!token) {
        throw new AppError("Token not recognized", HttpStatus.UNAUTHORIZED);
      }
      const issuance = token.issuance;
      if (credentialRequest.proof.proof_type != "jwt") {
        throw new AppError(
          "Only jwt proof types are supported at this moment",
          HttpStatus.BAD_REQUEST
        );
      }

      const parsedJwtHeader = decodeProtectedHeader(
        credentialRequest.proof.jwt
      );
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
      const verifiedJwt = await jwtVerify(credentialRequest.proof.jwt, key);

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

      if (verifiedJwt.payload.nonce !== token.nonce) {
        throw new AppError(
          "Nonce in JWT proof doesn't match registered nonce",
          HttpStatus.BAD_REQUEST
        );
      }

      const context = await this.contextService.getContextByType(
        issuance.credentialType
      );

      const credentialConfig = plainToInstance(InitCredentialConfig, {
        context: [
          context.documentUrl ??
            `${this.config.server.publicAddress}/api/context/${context.id}`
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
        credential: credentialJwt
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
