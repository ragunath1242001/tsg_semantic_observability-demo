import { Logger } from "@nestjs/common";
import { toArray } from "@tsg-dsp/common-api";
import {
  Credential,
  EnvelopedVerifiableCredential,
  isEnvelopedVerifiableCredential,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";
import { decodeJwt } from "jose";

import { TrustAnchor } from "../model.js";
import { verifyCredentialStatusValidity } from "./credential-status.js";
import { validateEnvelopedCredential } from "./enveloped-credential.js";
import { validateDataIntegrityProof } from "./proofs.js";

export async function verifyCredentialValidity(
  credential: VerifiableCredential | EnvelopedVerifiableCredential,
  trustAnchors: TrustAnchor[]
): Promise<{
  validExpiryDate: boolean;
  validTrustAnchors: boolean;
  validProof: boolean;
  validStatus: boolean;
}> {
  let validExpiryDate = false;
  let validTrustAnchors = false;
  let validProof = false;
  let validStatus = true;
  try {
    let plainCredential: Credential;
    if (isEnvelopedVerifiableCredential(credential)) {
      plainCredential = decodeJwt(
        credential.id.replace("data:application/vc+jwt,", "")
      );
      try {
        await validateEnvelopedCredential(credential);
        validProof = true;
      } catch (e) {
        Logger.debug(
          `Failed to validate enveloped credential ${credential.id}: ${e instanceof Error ? e.message : e}`,
          "PresentationValidation"
        );
      }
    } else {
      const { proof, ...credentialRemainder } = credential;
      plainCredential = credentialRemainder;
      try {
        for (const proofItem of toArray(proof)) {
          await validateDataIntegrityProof(plainCredential, proofItem);
        }
        validProof = true;
      } catch (e) {
        Logger.debug(
          `Failed to validate credential ${credential.id}: ${e instanceof Error ? e.message : e}`,
          "PresentationValidation"
        );
      }
    }

    if (plainCredential.validUntil) {
      validExpiryDate =
        new Date(plainCredential.validUntil).getTime() > new Date().getTime();
    } else if (plainCredential.expirationDate) {
      // Backward compatibility for older credentials
      validExpiryDate =
        new Date(plainCredential.expirationDate).getTime() >
        new Date().getTime();
    } else {
      validExpiryDate = true;
    }

    if (plainCredential.credentialStatus) {
      await Promise.all(
        toArray(plainCredential.credentialStatus).map(async (status) => {
          if (
            status.type === "BitstringStatusListEntry" &&
            ["revocation", "suspension"].includes(status.statusPurpose)
          ) {
            const verifiedStatus = await verifyCredentialStatusValidity(
              status.id,
              status.statusListIndex,
              false,
              trustAnchors
            );
            if (verifiedStatus.status) {
              validStatus = false;
            }
          }
        })
      );
    }
    const credentialTypes =
      trustAnchors.find(
        (trustAnchor: TrustAnchor) =>
          trustAnchor.identifier === plainCredential.issuer
      )?.credentialTypes || [];

    validTrustAnchors = plainCredential.type
      .filter((t) => t !== "VerifiableCredential")
      .every((type) => credentialTypes.includes(type));
  } catch (e) {
    Logger.error(
      `Failed to verify credential ${credential.id}: ${e instanceof Error ? e.message : e}`,
      "PresentationValidation"
    );
  }
  return {
    validExpiryDate: validExpiryDate,
    validTrustAnchors: validTrustAnchors,
    validProof: validProof,
    validStatus: validStatus
  };
}
