import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { KeysService } from "./keys.service.js";
import {
  CompactSign,
  compactVerify,
  CompactVerifyResult,
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  JWTPayload,
  jwtVerify,
  SignJWT,
} from "jose";
import { AppError } from "../utils/error.js";
import { Signature } from "@tsg-dsp/common-dsp";
import { canonicalize } from "@tufjs/canonical-json";
import { plainToInstance } from "class-transformer";
import { KeyMaterials } from "../model/credentials.dao.js";
import { jsonldOptions } from "../utils/cachingContextLoader.js";
import { signingAlgorithm } from "../utils/keymapping.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { DidService } from "../did/did.service.js";
import jsonld from "jsonld";
import crypto from "crypto";

@Injectable()
export class SignatureService {
  constructor(
    private readonly keyService: KeysService,
    private readonly didService: DidService,
    private readonly didResolver: DidResolverService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async signJwt(
    body: JWTPayload,
    audience: string | string[],
    options?: {
      key?: string;
      subject?: boolean;
      expirationTime?: string;
      typ?: string;
      jti?: boolean;
    }
  ): Promise<string> {
    let signingKey: KeyMaterials;
    if (!options?.key) {
      signingKey = await this.keyService.getDefaultKey();
    } else {
      signingKey = await this.keyService.getKey(options?.key);
    }
    const jwt = new SignJWT(body)
      .setProtectedHeader({
        alg: signingAlgorithm(signingKey.type),
        kid: `${await this.didService.getDidId()}#${signingKey.id}`,
        typ: options?.typ,
      })
      .setIssuedAt()
      .setIssuer(await this.didService.getDidId())
      .setAudience(audience);
    if (options?.subject !== false) {
      jwt.setSubject(await this.didService.getDidId());
    }
    if (options?.expirationTime) {
      jwt.setExpirationTime(options.expirationTime);
    }
    if (options?.jti !== false) {
      jwt.setJti(crypto.randomUUID());
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
    const resolvedDid = await this.didResolver.resolve(payload.iss);
    const verificationMethod = resolvedDid.verificationMethod?.find(
      (m) => m.id === header.kid || m.id === `${payload.iss}#${header.kid}`
    );
    if (!verificationMethod || !verificationMethod.publicKeyJwk) {
      throw new AppError(
        `Could not validate ID token. Could not resolve public key for ${header.kid}.`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    const publicKey = await importJWK(verificationMethod.publicKeyJwk);
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

  async signJws(
    document: any,
    normalization: "RDFC" | "JCS",
    key?: string
  ): Promise<{ jws: string; verificationMethod: string }> {
    let normalized: string;
    switch (normalization) {
      case "RDFC":
        try {
          normalized = await jsonld.normalize(document, {
            ...jsonldOptions,
            algorithm: "URDNA2015",
          });
        } catch (e) {
          throw new AppError(
            `Could not normalize the plain document via URDNA2015`,
            HttpStatus.BAD_REQUEST,
            e
          );
        }
        break;
      case "JCS":
        normalized = canonicalize(document);
        break;
    }
    let signingKey: KeyMaterials;
    if (!key) {
      signingKey = await this.keyService.getDefaultKey();
    } else {
      signingKey = await this.keyService.getKey(key);
    }
    this.logger.debug(`Signing with key ${signingKey.id}`);
    const hash = crypto.createHash("sha256").update(normalized).digest("hex");
    const signature = new CompactSign(
      new TextEncoder().encode(hash)
    ).setProtectedHeader({
      alg: signingAlgorithm(signingKey.type),
      b64: false,
      crit: ["b64"],
    });
    const privateKey = await importJWK(signingKey.privateKey);
    return {
      jws: await signature.sign(privateKey),
      verificationMethod: `${await this.didService.getDidId()}#${
        signingKey.id
      }`,
    };
  }

  async signAsJsonWebSignature(
    document: any,
    key?: string,
    proofPurpose: string = "assertionMethod"
  ): Promise<Signature> {
    const signedJws = await this.signJws(document, "RDFC", key);
    return plainToInstance(Signature, {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      proofPurpose: proofPurpose,
      jws: signedJws.jws,
      verificationMethod: signedJws.verificationMethod,
    });
  }

  async validateJsonWebSignature(
    plainDocument: any,
    proof: Signature,
    issuerDidId?: string
  ): Promise<CompactVerifyResult> {
    const didId = issuerDidId ?? proof.verificationMethod.split("#")[0];

    const resolvedIssuerDid = await this.didResolver.resolve(didId);

    let normalized;
    try {
      normalized = await jsonld.normalize(plainDocument, {
        ...jsonldOptions,
        algorithm: "URDNA2015",
      });
    } catch (e) {
      throw new AppError(
        `Could not normalize the plain document via URDNA2015`,
        HttpStatus.BAD_REQUEST,
        e
      );
    }
    const hash = crypto.createHash("sha256").update(normalized).digest("hex");
    const jwsWithHash = proof.jws.replace("..", `.${hash}.`);

    const usedKey = resolvedIssuerDid.verificationMethod?.find(
      (m) => m.id === proof.verificationMethod
    );

    if (!usedKey || !usedKey.publicKeyJwk) {
      throw new AppError(
        `Could not find matching public key for ${proof.verificationMethod}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "debug");
    }
    try {
      return await compactVerify(
        jwsWithHash,
        await importJWK(usedKey.publicKeyJwk)
      );
    } catch (e) {
      this.logger.debug(`Verification failed: ${e}`);
      throw new AppError(`Verification failed`, HttpStatus.BAD_REQUEST, e);
    }
  }
}
