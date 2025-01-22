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
  Proof,
  toArray,
  BitstringStatusList
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { CredentialsService } from "../credentials/credentials.service.js";
import { RootConfig, SignatureType } from "../config.js";
import { DidService } from "../did/did.service.js";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { SignatureService } from "../keys/signature.service.js";
import { AppError } from "../utils/error.js";
import { Bitstring } from "@digitalbazaar/bitstring";
import axios from "axios";
import { base58btcToBase64url } from "../utils/keys/typeconverter.js";
import { VerifiedCredentialStatus } from "@tsg-dsp/wallet-dtos";

interface CacheEntry {
  time: number;
  context: VerifiableCredential<Proof, BitstringStatusList>;
}

@Injectable()
export class PresentationService {
  constructor(
    private readonly config: RootConfig,
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly didService: DidService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  readonly cachedStatusCredentials = new Map<string, CacheEntry>();

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

    const { validExpiryDate, validTrustAnchors, validProof, validStatus } = (
      await Promise.all(
        toArray(vp.verifiableCredential).map((vc) =>
          this.validateCredential(vc)
        )
      )
    ).reduce(
      (acc, current) => {
        return {
          validExpiryDate: [...acc.validExpiryDate, current.validExpiryDate],
          validTrustAnchors: [
            ...acc.validTrustAnchors,
            current.validTrustAnchors
          ],
          validProof: [...acc.validProof, current.validProof],
          validStatus: [...acc.validStatus, current.validStatus]
        };
      },
      {
        validExpiryDate: [] as boolean[],
        validTrustAnchors: [] as boolean[],
        validProof: [] as boolean[],
        validStatus: [] as boolean[]
      }
    );

    const valid =
      validateJWTSignature &&
      (validateAudience !== undefined ? validateAudience : true) &&
      validateJWTExpiryDate &&
      validProof.every((r) => r) &&
      validExpiryDate.every((r) => r) &&
      validStatus.every((r) => r);

    return {
      vp: vpJwt.vp,
      valid: valid,
      validExpiryDate: validExpiryDate,
      validProof: validProof,
      validStatus: validStatus,
      validTrustAnchors: validTrustAnchors,
      validateJWTSignature: validateJWTSignature,
      validateJWTExpiryDate: validateJWTExpiryDate,
      validateAudience: validateAudience
    };
  }

  async validateCredential(credential: VerifiableCredential): Promise<{
    validExpiryDate: boolean;
    validTrustAnchors: boolean;
    validProof: boolean;
    validStatus: boolean;
  }> {
    let validExpiryDate = false;
    let validTrustAnchors = false;
    let validProof = false;
    let validStatus = true;
    try {
      if (credential.validUntil) {
        validExpiryDate =
          new Date(credential.validUntil).getTime() > new Date().getTime();
      } else if (credential.expirationDate) {
        validExpiryDate =
          new Date(credential.expirationDate).getTime() > new Date().getTime();
      } else {
        validExpiryDate = true;
      }

      if (credential.credentialStatus) {
        for (const status of toArray(credential.credentialStatus)) {
          if (
            status.type === "BitstringStatusListEntry" &&
            ["revocation", "suspension"].includes(status.statusPurpose)
          ) {
            const verifiedStatus = await this.verifyCredentialStatus(
              status.id,
              status.statusListIndex
            );
            if (verifiedStatus.status) {
              validStatus = false;
            }
          }
        }
      }

      const credentialTypes =
        this.config.trustAnchors.find(
          (trustAnchor) => trustAnchor.identifier === credential.issuer
        )?.credentialTypes || [];
      validTrustAnchors = credential.type
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
        validProof = true;
      } catch (e) {}
    } finally {
      return {
        validExpiryDate: validExpiryDate,
        validTrustAnchors: validTrustAnchors,
        validProof: validProof,
        validStatus: validStatus
      };
    }
  }

  private async getStatusCredential(
    statusListCredential: string,
    disableCache: boolean = false
  ): Promise<VerifiableCredential<Proof, BitstringStatusList>> {
    const cacheEntry = this.cachedStatusCredentials.get(statusListCredential);
    if (!disableCache && cacheEntry) {
      if (cacheEntry.time + 24 * 60 * 60 * 1000 > new Date().getTime()) {
        return cacheEntry.context;
      }
    }
    try {
      const response =
        await axios.get<VerifiableCredential<Proof, BitstringStatusList>>(
          statusListCredential
        );
      const parsedCredential = plainToInstance(
        VerifiableCredential<Proof, BitstringStatusList>,
        response.data
      );
      const validationResult = await this.validateCredential(parsedCredential);
      if (!validationResult.validProof || !validationResult.validExpiryDate) {
        throw new AppError(
          `Could not validate StatusListCredential ${statusListCredential}`,
          HttpStatus.BAD_REQUEST
        );
      }
      this.cachedStatusCredentials.set(statusListCredential, {
        time: new Date().getTime(),
        context: parsedCredential
      });
      return parsedCredential;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Could not fetch StatusListCredential ${statusListCredential}`,
          HttpStatus.BAD_REQUEST,
          error
        );
      }
      throw new AppError(
        `Unknown error during retrieval of StatusListCredential ${statusListCredential}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  async verifyCredentialStatus(
    statusListCredential: string,
    position: string,
    disableCache: boolean = false
  ) {
    const credential = await this.getStatusCredential(
      statusListCredential,
      disableCache
    );
    try {
      let encodedList = toArray(credential.credentialSubject)[0].encodedList;
      if (encodedList.startsWith("z")) {
        encodedList = base58btcToBase64url(encodedList.slice(1));
      } else {
        encodedList = encodedList.slice(1);
      }
      const buffer = await Bitstring.decodeBits({ encoded: encodedList });
      const bitstring = new Bitstring({ buffer });
      return plainToInstance(VerifiedCredentialStatus, {
        statusListCredential: statusListCredential,
        statusListIndex: position,
        statusPurpose: toArray(credential.credentialSubject)[0].statusPurpose,
        status: bitstring.get(parseInt(position))
      });
    } catch (error) {
      throw new AppError(
        `Could not verify position ${position} in StatusListCredential ${statusListCredential}`,
        HttpStatus.BAD_REQUEST,
        error
      );
    }
  }
}
