import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import {
  DataIntegrityProof,
  JsonWebSignature2020,
  Proof
} from "@tsg-dsp/common-dsp";
import {
  generateSignedDataIntegrityProof,
  generateSignedJsonWebSignature2020,
  generateSignedJwt
} from "@tsg-dsp/common-signing-and-validation";
import { JWTPayload } from "jose";

import { RootConfig, SignatureType } from "../config.js";
import { DidService } from "../did/did.service.js";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { KeysService } from "./keys.service.js";

@Injectable()
export class SignatureService {
  constructor(
    private readonly config: RootConfig,
    private readonly keyService: KeysService,
    private readonly didService: DidService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private async getKey(key?: string) {
    if (!key) {
      return await this.keyService.getDefaultKey();
    } else {
      return await this.keyService.getKey(key);
    }
  }

  async signAsJwt(
    body: JWTPayload,
    audience: string | string[] | undefined,
    options?: {
      key?: string;
      subject?: boolean | string;
      expirationTime?: string;
      typ?: string;
      jti?: boolean | string;
    }
  ): Promise<string> {
    const signingKey: KeyMaterialDao = await this.getKey(options?.key);
    const didId = await this.didService.getDidId();

    return await generateSignedJwt(
      body,
      signingKey.id,
      signingKey.privateKey,
      signingKey.type,
      didId,
      audience,
      options
    );
  }

  async signAsProof(
    document: any,
    keyId?: string,
    type?: "DataIntegrityProof" | "JsonWebSignature2020",
    normalization: "RDFC" | "JCS" = "RDFC",
    proofPurpose: string = "assertionMethod",
    options: Partial<DataIntegrityProof> = {},
    embeddedVerificationMethod: boolean = false
  ): Promise<Proof> {
    const proofType =
      (type ??
      this.config.signature.default === SignatureType.DATA_INTEGRITY_PROOF)
        ? "DataIntegrityProof"
        : "JsonWebSignature2020";
    if (proofType == "DataIntegrityProof") {
      return await this.signAsDataIntegrityProof(
        normalization,
        document,
        keyId,
        proofPurpose,
        options,
        embeddedVerificationMethod
      );
    } else {
      if (normalization != "RDFC") {
        this.logger.warn(
          "JCS canonization cannot be used in combination with JsonWebSignature2020, reverting back to RDFC"
        );
      }
      if (Object.keys(options).length > 0) {
        this.logger.warn(
          "Proof options cannot be used in combination with JsonWebSignature2020, ignoring options"
        );
      }
      if (embeddedVerificationMethod) {
        this.logger.warn(
          "Embedded Verification Method cannot be used in combination with JsonWebSignature2020, ignoring"
        );
      }

      return await this.signAsJsonWebSignature2020(
        document,
        keyId,
        proofPurpose
      );
    }
  }

  async signAsDataIntegrityProof(
    normalization: "RDFC" | "JCS",
    document: any,
    keyId?: string,
    proofPurpose: string = "assertionMethod",
    options: Partial<DataIntegrityProof> = {},
    embeddedVerificationMethod: boolean = false
  ): Promise<DataIntegrityProof> {
    try {
      const signingKey: KeyMaterialDao = await this.getKey(keyId);
      const didId = await this.didService.getDidId();
      return await generateSignedDataIntegrityProof(
        document,
        didId,
        signingKey.id,
        signingKey.publicKey,
        signingKey.privateKey,
        signingKey.type,
        proofPurpose,
        normalization,
        embeddedVerificationMethod,
        options
      );
    } catch (e) {
      throw new AppError(
        "Could not sign data as DataIntegrityProof",
        HttpStatus.INTERNAL_SERVER_ERROR,
        e
      ).andLog(this.logger, "warn", true);
    }
  }

  async signAsJsonWebSignature2020(
    document: any,
    keyId?: string,
    proofPurpose: string = "assertionMethod"
  ): Promise<JsonWebSignature2020> {
    const signingKey: KeyMaterialDao = await this.getKey(keyId);
    const didId: string = await this.didService.getDidId();
    return await generateSignedJsonWebSignature2020(
      document,
      didId,
      signingKey.id,
      signingKey.privateKey,
      signingKey.type,
      proofPurpose
    );
  }
}
