import { parseVerificationMethod } from "./parse.js";
import { canonizeAndHash } from "../utils/canonization.js";
import { cryptoSuiteFromJws } from "../utils/cryptosuite.js";

import { base58btcToBase64url } from "../utils/typeconverter.js";
import { computeProofConfigHash } from "../utils/hash.js";
import {
  DataIntegrityProof,
  JsonWebSignature2020,
  Proof
} from "@tsg-dsp/common-dsp";
import { AppError } from "@tsg-dsp/common-api";
import { HttpStatus } from "@nestjs/common";
import {
  decodeJwt,
  decodeProtectedHeader,
  FlattenedVerifyResult,
  importJWK,
  JWTPayload,
  jwtVerify
} from "jose";
import { verifyJws } from "./verify.js";

export async function validateDataIntegrityProof(
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
  const signingKey = await parseVerificationMethod(
    proof.verificationMethod,
    issuerDidId,
    proof.cryptosuite
  );
  const normalization = proof.cryptosuite.includes("-rdfc-") ? "RDFC" : "JCS";
  const documentHash = await canonizeAndHash(plainDocument, normalization);
  const { proofValue, ...proofConfig } = proof;
  const jwsSignature = base58btcToBase64url(proofValue);
  const proofConfigHash = await computeProofConfigHash(
    proofConfig,
    normalization,
    plainDocument["@context"],
    "https://w3id.org/security/data-integrity/v2"
  );
  const combinedHash = Buffer.concat([proofConfigHash, documentHash]);
  return await verifyJws("", signingKey, combinedHash, jwsSignature);
}

export async function validateJsonWebSignature2020(
  plainDocument: any,
  proof: JsonWebSignature2020,
  issuerDidId?: string
): Promise<FlattenedVerifyResult> {
  const documentHash = await canonizeAndHash(plainDocument, "RDFC");
  const { jws, ...proofConfig } = proof;
  const proofConfigHash = await computeProofConfigHash(
    proofConfig,
    "RDFC",
    plainDocument["@context"],
    "https://w3id.org/security/suites/jws-2020/v1"
  );
  const combinedHash = Buffer.concat([proofConfigHash, documentHash]);
  const cryptoSuite = cryptoSuiteFromJws(jws);
  const usedKey = await parseVerificationMethod(
    proof.verificationMethod,
    issuerDidId,
    cryptoSuite
  );
  return await verifyJws(proof.jws, usedKey, combinedHash);
}

export async function validateProof(
  plainDocument: any,
  proof: Proof,
  issuerDidId?: string
): Promise<FlattenedVerifyResult> {
  if (
    proof instanceof DataIntegrityProof ||
    proof.type === "DataIntegrityProof"
  ) {
    return await validateDataIntegrityProof(
      plainDocument,
      proof as DataIntegrityProof,
      issuerDidId
    );
  } else if (
    proof instanceof JsonWebSignature2020 ||
    proof.type === "JsonWebSignature2020"
  ) {
    return await validateJsonWebSignature2020(
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

export async function validateJwt(token: string): Promise<JWTPayload> {
  const header = decodeProtectedHeader(token);
  const payload = decodeJwt(token);
  if (!header.kid) {
    throw new AppError(
      `Could not validate JWT. Missing Key ID in JWT.`,
      HttpStatus.BAD_REQUEST
    );
  }
  if (!payload.iss) {
    throw new AppError(
      `Could not validate JWT. Missing issuer in JWT.`,
      HttpStatus.BAD_REQUEST
    );
  }
  const cryptoSuite = cryptoSuiteFromJws(token);
  const verificationMethod = await parseVerificationMethod(
    header.kid,
    payload.iss,
    cryptoSuite
  );
  const publicKey = await importJWK(verificationMethod, verificationMethod.alg);
  try {
    await jwtVerify(token, publicKey);
    return payload;
  } catch (err) {
    throw new AppError(
      `Could not validate JWT. Invalid JWT signature for key ${header.kid}: ${err}.`,
      HttpStatus.BAD_REQUEST
    );
  }
}
