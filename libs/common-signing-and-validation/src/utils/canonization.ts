import { HttpStatus } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import crypto from "crypto";
import { canonicalize } from "json-canonicalize";
import jsonld from "jsonld";

import { jsonldOptions } from "./cachingContextLoader.js";

export async function canonize(
  document: any,
  algorithm: "RDFC" | "JCS",
  usingContext?: any
): Promise<string> {
  switch (algorithm) {
    case "RDFC":
      try {
        return await jsonld.canonize(
          JSON.parse(
            JSON.stringify({
              ...document,
              ...(usingContext ? { "@context": usingContext } : {})
            })
          ),
          {
            ...jsonldOptions,
            algorithm: "URDNA2015"
          }
        );
      } catch (e) {
        throw new AppError(
          `Could not canonize the plain document via RDF canonicalization URDNA2015`,
          HttpStatus.BAD_REQUEST,
          e
        );
      }
    case "JCS":
      return canonicalize(document);
  }
}

export async function canonizeAndHash(
  document: any,
  algorithm: "RDFC" | "JCS",
  usingContext?: any
): Promise<Buffer> {
  const canonized = await canonize(document, algorithm, usingContext);
  return crypto.createHash("sha256").update(canonized).digest();
}
