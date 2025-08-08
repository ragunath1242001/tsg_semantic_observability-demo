import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { EnvelopedVerifiableCredential } from "@tsg-dsp/common-dsp";
import { decodeProtectedHeader, FlattenedVerifyResult, jwtVerify } from "jose";

import { cryptoSuiteFromJws } from "../utils/cryptosuite.js";
import { parseVerificationMethod } from "./parse.js";

export async function validateEnvelopedCredential(
  credential: EnvelopedVerifiableCredential,
  issuerDidId?: string
): Promise<FlattenedVerifyResult> {
  if (!credential.id.startsWith("data:application/vc+jwt,")) {
    throw new AppError(
      `Enveloped Verifiable Credential ID must be a JWT, got ${credential.id}`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateEnvelopedCredential"), "debug");
  }
  const jwt = credential.id.replace("data:application/vc+jwt,", "");
  const header = decodeProtectedHeader(jwt);
  if (!header.kid) {
    throw new AppError(
      `Enveloped Verifiable Credential ID must have a Key ID in the header`,
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateEnvelopedCredential"), "debug");
  }
  const cryptoSuite = cryptoSuiteFromJws(jwt);
  const usedKey = await parseVerificationMethod(
    header.kid,
    issuerDidId,
    cryptoSuite
  );
  return await jwtVerify(jwt, usedKey);
}
