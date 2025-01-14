import { plainToInstance } from "class-transformer";
import { decodeJwt } from "jose";
import {
  VerifiablePresentationJsonLd,
  VerifiablePresentation,
  VerifiableCredential,
  VerifiablePresentationJwt,
  PresentationValidation,
  JsonWebSignature2020,
  DataIntegrityProof,
  Proof
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { RootConfig, SignatureType } from "../config.js";
import { DidService } from "../did/did.service.js";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { toArray } from "../utils/unions.js";
import { SignatureService } from "../keys/signature.service.js";
import { AppError } from "../utils/error.js";

@Injectable()
export class PresentationService {
  constructor(
    private readonly config: RootConfig,
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly didResolver: DidResolverService,
    private readonly didService: DidService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createVerifiablePresentationJsonLd(
    credentialId: string,
    unwrap: boolean
  ): Promise<VerifiablePresentationJsonLd> {
    const credential =
      await this.credentialsService.getCredential(credentialId);
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      id: `${await this.didService.getDidId()}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap
        ? credential.credential
        : [credential.credential]
    };

    let proof: Proof;
    if (
      this.config.signature.credentials === SignatureType.DATA_INTEGRITY_PROOF
    ) {
      verifiablePresentation["@context"].push(
        "https://w3id.org/security/data-integrity/v2"
      );
      proof = await this.signatureService.signAsDataIntegrityProof(
        "RDFC",
        verifiablePresentation
      );
    } else {
      verifiablePresentation["@context"].push(
        "https://w3id.org/security/suites/jws-2020/v1"
      );
      proof = await this.signatureService.signAsJsonWebSignature2020(
        verifiablePresentation
      );
    }
    verifiablePresentation.proof = proof;
    return plainToInstance(VerifiablePresentationJsonLd, {
      vp: verifiablePresentation
    });
  }

  async createVerifiablePresentationJwt(
    credentials: string | VerifiableCredential[],
    audience: string,
    unwrap: boolean
  ): Promise<VerifiablePresentationJwt> {
    let vcs: VerifiableCredential[];
    if (Array.isArray(credentials)) {
      vcs = credentials;
    } else {
      const credential =
        await this.credentialsService.getCredential(credentials);
      vcs = [credential.credential];
    }
    const didId = await this.didService.getDidId();
    const verifiablePresentation: VerifiablePresentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      id: `${didId}#${crypto.randomUUID()}`,
      verifiableCredential: unwrap ? vcs[0] : vcs
    };
    return plainToInstance(VerifiablePresentationJwt, {
      vp: await this.signatureService.signAsJwt(
        { vp: verifiablePresentation },
        audience,
        {
          expirationTime: "24h"
        }
      )
    });
  }

  async validatePresentation(
    vpJwt: VerifiablePresentationJwt,
    audience?: string
  ): Promise<PresentationValidation> {
    const jwtPayload = decodeJwt(vpJwt.vp);
    const vp = plainToInstance(VerifiablePresentation, jwtPayload.vp);

    let validateJWTSignature;
    try {
      await this.signatureService.validateJwt(vpJwt.vp);
      validateJWTSignature = true;
    } catch (e) {
      validateJWTSignature = false;
    }

    const validateAudience = audience ? jwtPayload.aud === audience : undefined;
    const validateJWTExpiryDate = jwtPayload.exp
      ? jwtPayload.exp > new Date().getTime() / 1000
      : false;

    const { validateExpiryDate, validateTrustAnchors, validateCredentials } = (
      await Promise.all(
        toArray(vp.verifiableCredential).map((vc) =>
          this.validateCredential(vc)
        )
      )
    ).reduce(
      (acc, current) => {
        return {
          validateExpiryDate: [
            ...acc.validateExpiryDate,
            current.validateExpiryDate
          ],
          validateTrustAnchors: [
            ...acc.validateTrustAnchors,
            current.validateTrustAnchors
          ],
          validateCredentials: [
            ...acc.validateCredentials,
            current.validateCredentials
          ]
        };
      },
      {
        validateExpiryDate: [] as boolean[],
        validateTrustAnchors: [] as boolean[],
        validateCredentials: [] as boolean[]
      }
    );

    const valid =
      validateJWTSignature &&
      (validateAudience !== undefined ? validateAudience : true) &&
      validateJWTExpiryDate &&
      validateCredentials.every((r) => r) &&
      validateExpiryDate.every((r) => r);

    return {
      vp: vpJwt.vp,
      valid: valid,
      validateExpiryDate: validateExpiryDate,
      validateCredentials: validateCredentials,
      validateTrustAnchors: validateTrustAnchors,
      validateJWTSignature: validateJWTSignature,
      validateJWTExpiryDate: validateJWTExpiryDate,
      validateAudience: validateAudience
    };
  }

  private async validateCredential(credential: VerifiableCredential): Promise<{
    validateExpiryDate: boolean;
    validateTrustAnchors: boolean;
    validateCredentials: boolean;
  }> {
    let validateExpiryDate = false;
    let validateTrustAnchors = false;
    let validateCredentials = false;
    try {
      if (credential.validUntil) {
        validateExpiryDate =
          new Date(credential.validUntil).getTime() > new Date().getTime();
      } else if (credential.expirationDate) {
        validateExpiryDate =
          new Date(credential.expirationDate).getTime() > new Date().getTime();
      } else {
        validateExpiryDate = true;
      }

      const credentialTypes =
        this.config.trustAnchors.find(
          (trustAnchor) => trustAnchor.identifier === credential.issuer
        )?.credentialTypes || [];
      validateTrustAnchors = credential.type
        .filter((t) => t !== "VerifiableCredential")
        .every((type) => credentialTypes.includes(type));

      const { proof, ...plainCredential } = credential;
      try {
        for (const proofItem of toArray(proof)) {
          if (
            proofItem instanceof JsonWebSignature2020 ||
            proofItem.type === "JsonWebSignature2020"
          ) {
            await this.signatureService.validateJsonWebSignature2020(
              plainCredential,
              proofItem as JsonWebSignature2020
            );
          } else if (
            proofItem instanceof DataIntegrityProof ||
            proofItem.type === "DataIntegrityProof"
          ) {
            await this.signatureService.validateDataIntegrityProof(
              plainCredential,
              proofItem as DataIntegrityProof
            );
          } else {
            throw new AppError(
              `Unknown proof ${proofItem.type}`,
              HttpStatus.BAD_REQUEST
            );
          }
        }
        validateCredentials = true;
      } catch (e) {}
    } finally {
      return {
        validateExpiryDate,
        validateTrustAnchors,
        validateCredentials
      };
    }
  }
}
