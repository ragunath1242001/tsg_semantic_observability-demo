import { AppError } from "@tsg-dsp/common-api";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { TrustAnchor } from "../model.js";
import {
  cachedStatusCredentials,
  getStatusCredential,
  verifyBitstringStatus,
  verifyCredentialStatusValidity
} from "./credential-status.js";

describe("Credential Status Verification", () => {
  let server: SetupServer;

  beforeAll(() => {
    server = setupServer(
      http.get("http://localhost/statusList", () => {
        return HttpResponse.json({
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential", "BitstringStatusListCredential"],
          id: "http://localhost/statusList",
          issuer: "did:web:localhost",
          validFrom: "2025-02-28T10:47:54.426Z",
          validUntil: "2099-05-28T09:47:54.426Z",
          credentialSubject: {
            id: "http://localhost/statusList#list",
            type: "BitstringStatusList",
            statusPurpose: "revocation",
            encodedList: "uH4sIAAAAAAAAA2NgGAWjYBSMglEwCkbBSAMAnrro8QAIAAA"
          },
          proof: {
            type: "DataIntegrityProof",
            proofPurpose: "assertionMethod",
            verificationMethod: "did:web:localhost#key-0",
            cryptosuite: "eddsa-rdfc-2022",
            created: "2025-02-28T10:47:55.260Z",
            proofValue:
              "z49zVbm5JEn71f4gNY9gbvneQddR5yb2ZoC5R4RjZM1kGotYzh5sVxWAKvsZRJ74uRcixm8B9rNTkSbetHNYpXBdw"
          }
        });
      }),
      http.get("http://localhost/invalid-status", () => {
        return HttpResponse.json({}, { status: 404 });
      }),
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json({
          "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/jws-2020/v1"
          ],
          id: "did:web:localhost",
          verificationMethod: [
            {
              id: "did:web:localhost#key-0",
              type: "JsonWebKey2020",
              controller: "did:web:localhost",
              publicKeyJwk: {
                alg: "EdDSA",
                crv: "Ed25519",
                x: "usTBS6gWbx112ZxOvTjF_NSAHgMtovyjk_TGWPPhxdg",
                kty: "OKP"
              }
            }
          ],
          assertionMethod: ["did:web:localhost#key-0"]
        });
      })
    );
    server.listen({ onUnhandledRequest: "warn" });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    cachedStatusCredentials.clear();
  });

  describe("getStatusCredential", () => {
    it("should fetch and cache a status credential", async () => {
      const result = await getStatusCredential("http://localhost/statusList");
      expect(result).toBeDefined();
      expect(result.credentialSubject).toBeDefined();
      expect(cachedStatusCredentials.size).toBe(1);
    });

    it("should use cached value if available", async () => {
      // First request to populate cache
      await getStatusCredential("http://localhost/statusList");

      // Second request should use cache
      const result = await getStatusCredential("http://localhost/statusList");
      expect(result).toBeDefined();
      expect(result.credentialSubject).toBeDefined();
    });

    it("should bypass cache when disableCache is true", async () => {
      // First request to populate cache
      await getStatusCredential("http://localhost/statusList");

      // Second request with disableCache
      const result = await getStatusCredential(
        "http://localhost/statusList",
        true
      );
      expect(result).toBeDefined();
      expect(result.credentialSubject).toBeDefined();
    });

    it("should throw AppError when status credential cannot be fetched", async () => {
      await expect(
        getStatusCredential("http://localhost/invalid-status")
      ).rejects.toThrow(AppError);
    });
  });

  describe("verifyCredentialStatusValidity", () => {
    it("should throw AppError when status credential is invalid", async () => {
      const trustAnchors: TrustAnchor[] = [];

      await expect(
        verifyCredentialStatusValidity(
          "http://localhost/statusList",
          "0",
          false,
          trustAnchors
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("verifyBitstringStatus", () => {
    it("should verify a valid bitstring status", async () => {
      const result = await verifyBitstringStatus(
        {
          id: "http://localhost/statusList#list",
          type: "BitstringStatusList",
          statusPurpose: "revocation",
          encodedList: "uH4sIAAAAAAAAA2NgGAWjYBSMglEwCkbBSAMAnrro8QAIAAA"
        },
        "http://localhost/statusList",
        "1"
      );
      expect(result).toBeDefined();
      expect(result.status).toBe(false);
      expect(result.statusPurpose).toBe("revocation");
    });
    it("should verify a valid bitstring status with base58btc encoding", async () => {
      const result = await verifyBitstringStatus(
        {
          id: "http://localhost/statusList#list",
          type: "BitstringStatusList",
          statusPurpose: "revocation",
          encodedList: "z49Yk3e1rKoQzwjeF6iQW48cU7iXthJYbB2VeLZnuRhdD1aEj"
        },
        "http://localhost/statusList",
        "1"
      );
      expect(result).toBeDefined();
      expect(result.status).toBe(false);
      expect(result.statusPurpose).toBe("revocation");
    });
    it("should throw AppError for invalid bitstring status", async () => {
      await expect(
        verifyBitstringStatus(
          {
            id: "http://localhost/statusList#list",
            type: "BitstringStatusList",
            statusPurpose: "revocation",
            encodedList: "invalid-encoded-list"
          },
          "http://localhost/statusList",
          "1"
        )
      ).rejects.toThrow(AppError);
    });
  });
});
