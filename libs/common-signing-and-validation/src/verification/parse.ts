import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { JWK } from "jose";

import { resolveDid } from "../did/did.resolver.js";
import { encodedPublicKeyMultiBaseToJWK } from "../utils/keyconverter.js";

export async function parseVerificationMethod(
  verificationMethod: string,
  issuerDidId?: string,
  cryptosuite: string = ""
): Promise<JWK> {
  if (verificationMethod.startsWith("z")) {
    return encodedPublicKeyMultiBaseToJWK(
      cryptosuite,
      verificationMethod.split("#")[0]
    );
  } else {
    const didId =
      issuerDidId?.split("#")?.[0] ?? verificationMethod.split("#")[0];
    const resolvedIssuerDid = await resolveDid(didId);
    const usedKey = resolvedIssuerDid.verificationMethod?.find(
      (m) =>
        m.id === verificationMethod ||
        m.id === `${issuerDidId}#${verificationMethod}`
    );
    if (usedKey?.publicKeyJwk) {
      return usedKey.publicKeyJwk;
    } else if (usedKey?.publicKeyMultibase) {
      return encodedPublicKeyMultiBaseToJWK(
        cryptosuite,
        usedKey.publicKeyMultibase
      );
    } else {
      throw new AppError(
        `Could not find matching public key for "${verificationMethod}"`,
        HttpStatus.BAD_REQUEST
      ).andLog(new Logger("parseVerificationMethod"), "debug");
    }
  }
}
