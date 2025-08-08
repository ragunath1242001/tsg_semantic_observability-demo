import { DataIntegrityProof } from "@tsg-dsp/common-dsp";

import { validateDataIntegrityProof } from "./proofs.js";

describe("Proof validation", () => {
  const didId = "did:key:z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz";
  describe("Validate Data Integrity Proof", () => {
    it("should validate a correct RDFC proof", async () => {
      const plainDocument = {
        "http://example.com/field": "value"
      };
      const proof: DataIntegrityProof = {
        created: "2025-07-23T20:54:06.568Z",
        cryptosuite: "eddsa-rdfc-2022",
        proofPurpose: "assertionMethod",
        proofValue:
          "z2u1DuYoxvnDu5MU3UdCqhbwbQecV6FKTsd1ivyYjkURtcmDNPV1Dn92yjz1uxw9aWd3DHjRSVkhvr7WrLAFGxpwb",
        type: "DataIntegrityProof",
        verificationMethod:
          "did:key:z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz#z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz"
      };
      const result = await validateDataIntegrityProof(
        plainDocument,
        proof,
        didId
      );
      expect(result).toBeDefined();
    });
    it("should validate a correct JCS proof", async () => {
      const plainDocument = {
        "http://example.com/field": "value"
      };
      const proof: DataIntegrityProof = {
        created: "2025-07-23T20:59:10.787Z",
        cryptosuite: "eddsa-jcs-2022",
        proofPurpose: "assertionMethod",
        proofValue:
          "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe",
        type: "DataIntegrityProof",
        verificationMethod:
          "did:key:z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz#z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz"
      };
      const result = await validateDataIntegrityProof(
        plainDocument,
        proof,
        didId
      );
      expect(result).toBeDefined();
    });
    it("should throw an error for missing verification method in proof", async () => {
      const plainDocument = {
        "http://example.com/field": "value"
      };
      const proof: DataIntegrityProof = {
        created: "2025-07-23T20:59:10.787Z",
        cryptosuite: "eddsa-jcs-2022",
        proofPurpose: "assertionMethod",
        proofValue:
          "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe",
        type: "DataIntegrityProof"
      };
      await expect(
        validateDataIntegrityProof(plainDocument, proof, didId)
      ).rejects.toThrow(
        "Only DataIntegrityProofs supported with verificationMethod present"
      );
    });
  });
});
