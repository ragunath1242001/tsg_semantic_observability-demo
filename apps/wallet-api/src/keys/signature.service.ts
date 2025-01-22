import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { KeysService } from "./keys.service.js";
import {
  CompactSign,
  decodeJwt,
  decodeProtectedHeader,
  flattenedVerify,
  FlattenedVerifyResult,
  importJWK,
  JWK,
  JWTPayload,
  jwtVerify,
  SignJWT
} from "jose";
import { AppError } from "../utils/error.js";
import {
  DataIntegrityProof,
  JsonWebSignature2020,
  Proof,
  toArray
} from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { signingAlgorithm } from "../utils/keymapping.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { DidService } from "../did/did.service.js";
import crypto from "crypto";
import {
  encodedPublicKeyMultiBaseToJWK,
  jwkToMultibase
} from "../utils/keys/keyconverter.js";
import {
  base58btcToBase64url,
  base64urlToBase58btc
} from "../utils/keys/typeconverter.js";
import {
  cryptoSuiteFromJws,
  getCryptoSuite
} from "../utils/keys/cryptosuite.js";
import { canonizeAndHash } from "../utils/keys/canonization.js";
import { RootConfig, SignatureType } from "../config.js";

@Injectable()
export class SignatureService {
  constructor(
    private readonly config: RootConfig,
    private readonly keyService: KeysService,
    private readonly didService: DidService,
    private readonly didResolver: DidResolverService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private async getKey(key?: string) {
    if (!key) {
      return await this.keyService.getDefaultKey();
    } else {
      return await this.keyService.getKey(key);
    }
  }

  private async parseVerificationMethod(
    verificationMethod: string,
    issuerDidId?: string,
    cryptosuite: string = ""
  ): Promise<JWK> {
    if (verificationMethod.startsWith("z")) {
      return encodedPublicKeyMultiBaseToJWK(
        cryptosuite,
        verificationMethod.split("#")[0]
      );
    } else {
      const didId =
        issuerDidId?.split("#")?.[0] ?? verificationMethod.split("#")[0];
      const resolvedIssuerDid = await this.didResolver.resolve(didId);
      const usedKey = resolvedIssuerDid.verificationMethod?.find(
        (m) =>
          m.id === verificationMethod ||
          m.id === `${issuerDidId}#${verificationMethod}`
      );
      if (usedKey?.publicKeyJwk) {
        return usedKey.publicKeyJwk;
      } else if (usedKey?.publicKeyMultibase) {
        return encodedPublicKeyMultiBaseToJWK(
          cryptosuite,
          usedKey.publicKeyMultibase
        );
      } else {
        this.logger.debug(
          `Resolved DID (${didId}): ${JSON.stringify(resolvedIssuerDid)}`
        );
        throw new AppError(
          `Could not find matching public key for "${verificationMethod}"`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger, "debug");
      }
    }
  }

  private async computeProofConfigHash(
    proofConfig: any,
    algorithm: "RDFC" | "JCS",
    context: string | string[],
    proofContext: string
  ) {
    let proofConfigHash;
    try {
      proofConfigHash = await canonizeAndHash(proofConfig, algorithm, context);
    } catch (e) {
      proofConfig["@context"] = [...toArray(context), proofContext];
      proofConfigHash = await canonizeAndHash(proofConfig, algorithm, context);
    }
    return proofConfigHash;
  }

  private async signAsJws(hash: Buffer, signingKey: KeyMaterialDao) {
    const signature = new CompactSign(hash).setProtectedHeader({
      alg: signingAlgorithm(signingKey.type),
      b64: false,
      crit: ["b64"]
    });
    const privateKey = await importJWK(signingKey.privateKey);
    return await signature.sign(privateKey);
  }

  private async verifyJws(
    jws: string,
    publicKey: JWK,
    payload: string | Uint8Array<ArrayBufferLike>,
    signature?: string
  ): Promise<FlattenedVerifyResult> {
    try {
      let protectedHeader;
      if (signature) {
        protectedHeader = Buffer.from(
          JSON.stringify({
            alg: publicKey.alg,
            b64: false,
            crit: ["b64"]
          })
        ).toString("base64url");
      } else {
        protectedHeader = jws.split(".")[0];
      }
      return await flattenedVerify(
        {
          protected: protectedHeader,
          signature: signature ?? jws.split(".")[2],
          payload: payload
        },
        await importJWK(publicKey)
      );
    } catch (e) {
      this.logger.debug(`Verification failed: ${e}`);
      throw new AppError(`Verification failed`, HttpStatus.BAD_REQUEST, e);
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
    const signingKey = await this.getKey(options?.key);
    const jwt = new SignJWT(body)
      .setProtectedHeader({
        alg: signingAlgorithm(signingKey.type),
        kid: `${await this.didService.getDidId()}#${signingKey.id}`,
        typ: options?.typ
      })
      .setIssuedAt()
      .setIssuer(await this.didService.getDidId());
    if (audience) {
      jwt.setAudience(audience);
    }
    if (options?.subject !== false) {
      if (typeof options?.subject === "string") {
        jwt.setSubject(options.subject);
      } else {
        jwt.setSubject(await this.didService.getDidId());
      }
    }
    if (options?.expirationTime) {
      jwt.setExpirationTime(options.expirationTime);
    }
    if (options?.jti !== false) {
      if (typeof options?.jti === "string") {
        jwt.setJti(options.jti);
      } else {
        jwt.setJti(crypto.randomUUID());
      }
    }
    return await jwt.sign(await importJWK(signingKey.privateKey));
  }

  async validateJwt(token: string): Promise<JWTPayload> {
    const header = decodeProtectedHeader(token);
    const payload = decodeJwt(token);
    if (!header.kid) {
      throw new AppError(
        `Could not validate ID token. Missing Key ID in JWT.`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    if (!payload.iss) {
      throw new AppError(
        `Could not validate ID token. Missing issuer in JWT.`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    const cryptoSuite = cryptoSuiteFromJws(token);
    const verificationMethod = await this.parseVerificationMethod(
      header.kid,
      payload.iss,
      cryptoSuite
    );
    const publicKey = await importJWK(verificationMethod);
    try {
      await jwtVerify(token, publicKey);
      return payload;
    } catch (err) {
      throw new AppError(
        `Could not validate ID token. Invalid JWT signature for key ${header.kid}: ${err}.`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
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
      const signingKey = await this.getKey(keyId);
      const verificationMethod = embeddedVerificationMethod
        ? jwkToMultibase(signingKey.publicKey, false)
        : `${await this.didService.getDidId()}#${signingKey.id}`;
      const documentHash = await canonizeAndHash(document, normalization);
      const proof: Omit<DataIntegrityProof, "proofValue"> = {
        type: "DataIntegrityProof",
        proofPurpose: proofPurpose,
        verificationMethod: verificationMethod,
        cryptosuite: getCryptoSuite(signingKey.type, normalization),
        created: new Date().toISOString(),
        ...options
      };
      const proofConfigHash = await this.computeProofConfigHash(
        proof,
        normalization,
        document["@context"],
        "https://w3id.org/security/data-integrity/v2"
      );
      const hash = Buffer.concat([proofConfigHash, documentHash]);
      const jws = await this.signAsJws(hash, signingKey);
      return plainToInstance(DataIntegrityProof, {
        ...proof,
        proofValue: base64urlToBase58btc(jws.split(".")[2])
      });
    } catch (e) {
      throw new AppError(
        "Could not sign data as DataIntegrityProof",
        HttpStatus.INTERNAL_SERVER_ERROR,
        e
      ).andLog(this.logger, "warn");
    }
  }

  async signAsJsonWebSignature2020(
    document: any,
    keyId?: string,
    proofPurpose: string = "assertionMethod"
  ): Promise<JsonWebSignature2020> {
    const signingKey = await this.getKey(keyId);
    const verificationMethod = `${await this.didService.getDidId()}#${
      signingKey.id
    }`;
    const documentHash = await canonizeAndHash(document, "RDFC");
    const proofConfig: Omit<JsonWebSignature2020, "jws"> = {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      proofPurpose: proofPurpose,
      verificationMethod: verificationMethod
    };
    const proofConfigHash = await this.computeProofConfigHash(
      proofConfig,
      "RDFC",
      document["@context"],
      "https://w3id.org/security/suites/jws-2020/v1"
    );
    const combinedHash = Buffer.concat([proofConfigHash, documentHash]);
    const jws = await this.signAsJws(combinedHash, signingKey);
    return plainToInstance(JsonWebSignature2020, {
      ...proofConfig,
      jws
    });
  }

  async validateProof(
    plainDocument: any,
    proof: Proof,
    issuerDidId?: string
  ): Promise<FlattenedVerifyResult> {
    if (
      proof instanceof DataIntegrityProof ||
      proof.type === "DataIntegrityProof"
    ) {
      return await this.validateDataIntegrityProof(
        plainDocument,
        proof as DataIntegrityProof,
        issuerDidId
      );
    } else if (
      proof instanceof JsonWebSignature2020 ||
      proof.type === "JsonWebSignature2020"
    ) {
      return await this.validateJsonWebSignature2020(
        plainDocument,
        proof as JsonWebSignature2020,
        issuerDidId
      );
    } else {
      throw new AppError(
        `Proof type ${proof.type} not supported`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
  async validateDataIntegrityProof(
    plainDocument: any,
    proof: DataIntegrityProof,
    issuerDidId?: string
  ) {
    if (!proof.verificationMethod) {
      throw new AppError(
        "Only DataIntegrityProofs supported with verificationMethod present",
        HttpStatus.BAD_REQUEST
      );
    }
    const signingKey = await this.parseVerificationMethod(
      proof.verificationMethod,
      issuerDidId,
      proof.cryptosuite
    );
    const normalization = proof.cryptosuite.includes("-rdfc-") ? "RDFC" : "JCS";
    const documentHash = await canonizeAndHash(plainDocument, normalization);
    const { proofValue, ...proofConfig } = proof;
    const jwsSignature = base58btcToBase64url(proofValue);
    const proofConfigHash = await this.computeProofConfigHash(
      proofConfig,
      normalization,
      plainDocument["@context"],
      "https://w3id.org/security/data-integrity/v2"
    );
    const combinedHash = Buffer.concat([proofConfigHash, documentHash]);
    return await this.verifyJws("", signingKey, combinedHash, jwsSignature);
  }

  async validateJsonWebSignature2020(
    plainDocument: any,
    proof: JsonWebSignature2020,
    issuerDidId?: string
  ): Promise<FlattenedVerifyResult> {
    const documentHash = await canonizeAndHash(plainDocument, "RDFC");
    const { jws, ...proofConfig } = proof;
    const proofConfigHash = await this.computeProofConfigHash(
      proofConfig,
      "RDFC",
      plainDocument["@context"],
      "https://w3id.org/security/suites/jws-2020/v1"
    );
    const combinedHash = Buffer.concat([proofConfigHash, documentHash]);
    const cryptoSuite = cryptoSuiteFromJws(jws);
    const usedKey = await this.parseVerificationMethod(
      proof.verificationMethod,
      issuerDidId,
      cryptoSuite
    );
    return await this.verifyJws(proof.jws, usedKey, combinedHash);
  }
}
