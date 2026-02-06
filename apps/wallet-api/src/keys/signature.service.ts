import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import {
  Credential,
  DataIntegrityProof,
  EnvelopedVerifiablePresentation,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  generateSignedDataIntegrityProof,
  generateSignedJwt
} from "@tsg-dsp/common-signing-and-validation";
import { JWTPayload } from "jose";

import { DidService } from "../did/did.service.js";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { KeysService } from "./keys.service.js";

@Injectable()
export class SignatureService {
  constructor(
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
      expirationTime?: number | Date;
      typ?: string;
      jti?: boolean | string;
    }
  ): Promise<string> {
    const signingKey: KeyMaterialDao = await this.getKey(options?.key);
    const didId = await this.didService.getDidId();
    return await generateSignedJwt(body, didId, {
      key: {
        id: signingKey.id,
        signingKey: signingKey.privateKey,
        algorithm: signingKey.type
      },
      audience: audience,
      iat: true,
      expiresIn: options?.expirationTime,
      iss: true,
      jti: options?.jti
        ? options?.jti === true
          ? crypto.randomUUID()
          : options?.jti
        : undefined,
      subject: options?.subject,
      typ: options?.typ
    });
  }

  async signContainerAsJwt(
    container:
      | Credential
      | VerifiablePresentation
      | EnvelopedVerifiablePresentation,
    options: {
      keyId?: string;
      audience?: string | string[];
      iat?: boolean;
      expiresIn?: number | Date;
      iss?: boolean;
      jti?: string;
      nonce?: string;
      typ?: string;
      cty?: string;
    }
  ): Promise<string> {
    const { keyId, ...signOptions } = options;
    const signingKey: KeyMaterialDao = await this.getKey(keyId);
    const didId = await this.didService.getDidId();
    return await generateSignedJwt(container, didId, {
      key: {
        id: signingKey.id,
        signingKey: signingKey.privateKey,
        algorithm: signingKey.type
      },
      ...signOptions
    });
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
      this.logger.debug("Failed to sign document:");
      this.logger.debug(document);
      throw new AppError(
        "Could not sign data as DataIntegrityProof",
        HttpStatus.INTERNAL_SERVER_ERROR,
        e
      ).andLog(this.logger, "warn", true);
    }
  }
}
