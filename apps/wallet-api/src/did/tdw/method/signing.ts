import { Logger } from "@nestjs/common";
import {
  buffersToHex,
  canonizeAndHash,
  encodedPrivateKeyMultiBaseToJWK,
  getCryptoSuite,
  VerificationMethod
} from "@tsg-dsp/common-signing-and-validation";
import { CompactSign, importJWK } from "jose";
import { base58btc } from "multiformats/bases/base58";

import { createDate } from "./utils.js";

export const createSigner = (vm: VerificationMethod) => {
  return async (doc: any, challenge: string) => {
    try {
      const proof: any = {
        type: "DataIntegrityProof",
        cryptosuite: getCryptoSuite(vm.type, "JCS"),
        verificationMethod: vm.publicKeyMultibase,
        created: createDate(),
        proofPurpose: "authentication",
        challenge
      };
      const dataHash = await canonizeAndHash(doc, "JCS");
      const proofHash = await canonizeAndHash(proof, "JCS");
      const input = buffersToHex(dataHash, proofHash);
      const jwk = encodedPrivateKeyMultiBaseToJWK(
        vm.type,
        vm.secretKeyMultibase!
      );
      const signature = new CompactSign(
        new TextEncoder().encode(input)
      ).setProtectedHeader({
        alg: jwk.alg!,
        b64: false,
        crit: ["b64"]
      });
      const jws = await signature.sign(await importJWK(jwk));
      proof.proofValue = base58btc.encode(
        Buffer.from(jws.split(".")[2], "base64url")
      );
      return { ...doc, proof };
    } catch (e: any) {
      Logger.error(`Error signing document: ${e.message}`, "TDW createSigner");
      Logger.debug(e, "TDW createSigner");
      throw new Error(`Document signing failure: ${e.details}`, { cause: e });
    }
  };
};
