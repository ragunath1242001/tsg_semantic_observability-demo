import {
  CredentialSubject,
  EnvelopedVerifiableCredential,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";

import { TrustAnchor } from "../model.js";
import {
  createTestVerifiableCredential,
  testDidId
} from "../utils/mock-vc-vp.util.mock.js";
import { verifyCredentialValidity } from "./credential-validity.js";

describe("Credential Validity", () => {
  const trustAnchors: TrustAnchor[] = [
    {
      identifier: testDidId,
      credentialTypes: ["VerifiableCredential"]
    }
  ];
  it("should verify valid credential", async () => {
    const credential: VerifiableCredential<CredentialSubject> =
      await createTestVerifiableCredential(
        {
          id: testDidId
        },
        "DataIntegrityProof"
      );

    const result = await verifyCredentialValidity(credential, trustAnchors);

    expect(result.validProof).toBe(true);
    expect(result.validStatus).toBe(true);
    expect(result.validExpiryDate).toBe(true);
    expect(result.validTrustAnchors).toBe(true);
  });
  it("should verify valid enveloped credential", async () => {
    const credential: EnvelopedVerifiableCredential =
      await createTestVerifiableCredential(
        {
          id: testDidId
        },
        "enveloped"
      );

    const result = await verifyCredentialValidity(credential, trustAnchors);

    expect(result.validProof).toBe(true);
    expect(result.validStatus).toBe(true);
    expect(result.validExpiryDate).toBe(true);
    expect(result.validTrustAnchors).toBe(true);
  });

  it("should handle expired credential", async () => {
    const credential: VerifiableCredential<CredentialSubject> =
      await createTestVerifiableCredential(
        {
          id: testDidId
        },
        "DataIntegrityProof",
        {
          validFrom: new Date(Date.now() - 86400000), // 1 day ago
          validUntil: new Date(Date.now() - 3600000) // 1 hour ago
        }
      );

    const result = await verifyCredentialValidity(credential, trustAnchors);

    expect(result.validExpiryDate).toBe(false);
  });
  it("should handle credential without expiry date", async () => {
    const credential: VerifiableCredential<CredentialSubject> =
      await createTestVerifiableCredential(
        {
          id: testDidId
        },
        "DataIntegrityProof",
        {
          validUntil: false
        }
      );

    const result = await verifyCredentialValidity(credential, trustAnchors);

    expect(result.validExpiryDate).toBe(true);
  });
  it("should handle trust anchor mismatch", async () => {
    const credential: EnvelopedVerifiableCredential =
      await createTestVerifiableCredential(
        {
          id: testDidId
        },
        "enveloped",
        {
          credentialType: "InvalidCredentialType"
        }
      );

    const result = await verifyCredentialValidity(credential, []);

    expect(result.validTrustAnchors).toBe(false);
  });
});
