import { AppError } from "@tsg-dsp/common-api";
import { EnvelopedVerifiableCredential } from "@tsg-dsp/common-dsp";

import {
  createTestVerifiableCredential,
  testDidId
} from "../utils/mock-vc-vp.util.mock.js";
import { validateEnvelopedCredential } from "./enveloped-credential.js";

describe("Enveloped Credential Verification", () => {
  let credential: EnvelopedVerifiableCredential;

  beforeAll(async () => {
    credential = await createTestVerifiableCredential(
      {
        id: testDidId,
        test: "enveloped credential test"
      },
      "enveloped"
    );
  });

  it("should validate enveloped credential", async () => {
    const result = await validateEnvelopedCredential(credential);
    expect(result).toBeDefined();
  });

  it("should throw AppError for invalid enveloped credential", async () => {
    const invalidCredential: EnvelopedVerifiableCredential = {
      ...credential,
      id: "invalid-id"
    };
    await expect(
      validateEnvelopedCredential(invalidCredential)
    ).rejects.toThrow(AppError);
  });
  it("should throw for jwt without key id", async () => {
    const invalidCredential: EnvelopedVerifiableCredential = {
      ...credential,
      id: "data:application/vc+jwt,eyJhbGciOiJFZERTQSIsInR5cCI6InZjK2p3dCIsImN0eSI6InZjIn0.omitted.omitted"
    };
    await expect(
      validateEnvelopedCredential(invalidCredential)
    ).rejects.toThrow(AppError);
  });
});
