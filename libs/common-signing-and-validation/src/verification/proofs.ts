import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { DataIntegrityProof } from "@tsg-dsp/common-dsp";

import { canonizeAndHash } from "../utils/canonization.js";
import { computeProofConfigHash } from "../utils/hash.js";
import { base58btcToBase64url } from "../utils/typeconverter.js";
import { verifyJws } from "./jws.js";
import { parseVerificationMethod } from "./parse.js";

export async function validateDataIntegrityProof(
  plainDocument: any,
  proof: DataIntegrityProof,
  issuerDidId?: string
) {
  if (!proof.verificationMethod) {
    throw new AppError(
      "Only DataIntegrityProofs supported with verificationMethod present",
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("validateDataIntegrityProof"), "debug");
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
