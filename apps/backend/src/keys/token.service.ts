import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { KeysService } from "./keys.service.js";
import {
  JWTPayload,
  SignJWT,
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
} from "jose";
import { DidService } from "../did/did.service.js";
import { KeyMaterials } from "../model/credentials.dao.js";
import { AppError } from "../utils/error.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { signingAlgorithm } from "../utils/keymapping.js";

@Injectable()
export class TokenService {
  constructor(
    private readonly didService: DidService,
    private readonly didResolver: DidResolverService,
    private readonly keyService: KeysService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async create(
    payload: JWTPayload,
    expirationTime?: string,
    keyId?: string
  ): Promise<string> {
    const didId = await this.didService.getDidId();
    let keyMaterial: KeyMaterials;
    if (keyId) {
      keyMaterial = await this.keyService.getKey(keyId);
    } else {
      keyMaterial = await this.keyService.getDefaultKey();
    }
    const key = await importJWK(keyMaterial.privateKey);

    if (!payload.aud) {
      throw new AppError(
        `Cannot create token without audience`,
        HttpStatus.INTERNAL_SERVER_ERROR
      ).andLog(this.logger, "error");
    }
    const jwtBuilder = new SignJWT(payload)
      .setProtectedHeader({
        alg: signingAlgorithm(keyMaterial.type),
        kid: `${didId}#${keyMaterial.id}`,
      })
      .setIssuedAt()
      .setIssuer(didId)
      .setSubject(didId)
      .setJti(crypto.randomUUID());

    if (!payload.exp) {
      jwtBuilder.setExpirationTime(expirationTime ?? "5m");
    }

    return await jwtBuilder.sign(key);
  }

  async validate(token: string): Promise<JWTPayload> {
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
      (m) => m.id === header.kid
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
}
