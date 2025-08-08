import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { flattenedVerify, FlattenedVerifyResult, importJWK, JWK } from "jose";

import { estimateAlgorithm } from "../utils/cryptosuite.js";

export async function verifyJws(
  jws: string,
  publicKey: JWK,
  payload: string | Uint8Array<ArrayBufferLike>,
  signature?: string
): Promise<FlattenedVerifyResult> {
  try {
    let protectedHeader;
    if (!publicKey.alg) {
      publicKey.alg = estimateAlgorithm(publicKey);
    }
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
      await importJWK(publicKey, publicKey.alg)
    );
  } catch (e) {
    throw new AppError(`Verification failed`, HttpStatus.BAD_REQUEST, e).andLog(
      new Logger("verifyJws"),
      "debug"
    );
  }
}
