import { toArray } from "@tsg-dsp/common-api";

import { canonizeAndHash } from "./canonization.js";

export async function computeProofConfigHash(
  proofConfig: any,
  algorithm: "RDFC" | "JCS",
  context: string | string[],
  proofContext: string
) {
  return await canonizeAndHash(proofConfig, algorithm, [
    ...toArray(context),
    proofContext
  ]);
}
