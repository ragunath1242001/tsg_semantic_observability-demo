import { Logger } from "@nestjs/common";
import { compactVerify, importJWK } from "jose";

import { canonizeAndHash } from "../../../utils/canonization.js";
import { encodedPublicKeyMultiBaseToJWK } from "../../../utils/keyconverter.js";
import { base58btcToBase64url } from "../../../utils/typeconverter.js";
import { deriveHash } from "./utils.js";

export const keyIsAuthorized = (
  verificationMethod: string,
  updateKeys: string[]
) => {
  return updateKeys.includes(verificationMethod);
};

export const documentStateIsValid = async (
  doc: any,
  proofs: any[],
  updateKeys: string[]
) => {
  const allowedCcyptosuite = ["eddsa-jcs-2022", "ecdsa-jcs-2019", "RSASSA-PSS"];
  let i = 0;
  while (i < proofs.length) {
    const proof = proofs[i];
    if (!keyIsAuthorized(proof.verificationMethod.split("#")[0], updateKeys)) {
      throw new Error(
        `key ${proof.verificationMethod} is not authorized to update.`
      );
    }
    if (proof.type !== "DataIntegrityProof") {
      throw new Error(`Unknown proof type ${proof.type}`);
    }
    if (proof.proofPurpose !== "authentication") {
      throw new Error(`Unknown proof purpose] ${proof.proofPurpose}`);
    }
    if (!allowedCcyptosuite.includes(proof.cryptosuite)) {
      throw new Error(`Unknown cryptosuite ${proof.cryptosuite}`);
    }
    const { proofValue, ...restProof } = proof;
    const dataHash = await canonizeAndHash(doc, "JCS");
    const proofHash = await canonizeAndHash(restProof, "JCS");
    const input = Buffer.concat([dataHash, proofHash]).toString("hex");
    const jwk = encodedPublicKeyMultiBaseToJWK(
      proof.cryptosuite,
      proof.verificationMethod.split("#")[0]
    );
    try {
      const jwsHeader = Buffer.from(
        JSON.stringify({
          alg: jwk.alg!,
          b64: false,
          crit: ["b64"]
        })
      ).toString("base64url");
      const jwsSignature = base58btcToBase64url(proofValue);
      const jws = `${jwsHeader}.${input}.${jwsSignature}`;
      await compactVerify(jws, await importJWK(jwk));
    } catch (e) {
      Logger.error(
        `Failed to verify proof ${i} with verification method ${proof.verificationMethod}`,
        "TDW DocumentStateValidation"
      );
      Logger.debug(e, "TDW DocumentStateValidation");
      throw new Error(`Error verifying signature: ${e}`, { cause: e });
    }
    i++;
  }
  return true;
};

export const newKeysAreValid = (
  updateKeys: string[],
  previousNextKeyHashes: string[],
  nextKeyHashes: string[],
  previousPrerotate: boolean,
  prerotate: boolean
) => {
  if (prerotate && nextKeyHashes.length === 0) {
    throw new Error(`nextKeyHashes are required if prerotation enabled`);
  }
  if (previousPrerotate) {
    const inNextKeyHashes = updateKeys.reduce((result, key) => {
      const hashedKey = deriveHash(key);
      return result && previousNextKeyHashes.includes(hashedKey);
    }, true);
    if (!inNextKeyHashes) {
      throw new Error(`invalid updateKeys ${updateKeys}`);
    }
  }
  return true;
};
