import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import {
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  JWTPayload,
  jwtVerify,
  ProtectedHeaderParameters
} from "jose";
import { JOSEError } from "jose/errors";

import { cryptoSuiteFromJws, estimateAlgorithm } from "../utils/cryptosuite.js";
import { parseVerificationMethod } from "./parse.js";

const jtiCache = new Map<string, number>();

function cleanupJtiCache() {
  const now = Date.now();
  for (const [jti, exp] of jtiCache.entries()) {
    if (exp < now) jtiCache.delete(jti);
  }
}

if (typeof process !== "undefined" && process.versions?.node) {
  // Cleanup the JTI cache every minute in a Node.js environment
  setInterval(cleanupJtiCache, 60 * 1000).unref();
}

export async function validateJwt(
  token: string,
  options?: {
    validateIssuer?: boolean;
    validateJti?: boolean;
  }
): Promise<JWTPayload> {
  let header: ProtectedHeaderParameters;
  let payload: JWTPayload;
  try {
    header = decodeProtectedHeader(token);
    payload = decodeJwt(token);
  } catch (err) {
    throw new AppError(
      `Could not decode JWT: ${err}`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateJwt"), "debug");
  }
  if (!header.kid) {
    throw new AppError(
      `Could not validate JWT. Missing Key ID in JWT.`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateJwt"), "debug");
  }
  if (options?.validateIssuer !== false && !payload.iss) {
    throw new AppError(
      `Could not validate JWT. Missing issuer in JWT.`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateJwt"), "debug");
  }
  if (
    options?.validateJti !== false &&
    (!payload.jti || jtiCache.has(payload.jti))
  ) {
    throw new AppError(
      `Could not validate JWT, JTI error.`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateJwt"), "debug");
  }
  const cryptoSuite = cryptoSuiteFromJws(token);
  const verificationMethod = await parseVerificationMethod(
    header.kid,
    payload.iss,
    cryptoSuite
  );
  try {
    const alg =
      header.alg ||
      verificationMethod.alg ||
      estimateAlgorithm(verificationMethod);
    const publicKey = await importJWK(verificationMethod, alg);
    await jwtVerify(token, publicKey);
    if (payload.jti) {
      jtiCache.set(
        payload.jti,
        payload.exp ? payload.exp * 1000 : Date.now() + 5 * 60 * 1000
      );
    }
    return payload;
  } catch (err) {
    if (err instanceof JOSEError) {
      throw new AppError(
        `Could not validate JWT. Invalid JWT signature for key ${header.kid}: ${err.message}`,
        HttpStatus.BAD_REQUEST
      ).andLog(new Logger("validateJwt"), "debug");
    }
    throw new AppError(
      `Could not validate JWT. Invalid JWT signature for key ${header.kid}`,
      HttpStatus.BAD_REQUEST,
      err
    ).andLog(new Logger("validateJwt"), "debug");
  }
}
