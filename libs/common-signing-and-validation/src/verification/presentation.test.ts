import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "@jest/globals";
import { AppError } from "@tsg-dsp/common-api";
import {
  CredentialSubject,
  DataIntegrityProof,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";
import {
  Field,
  PresentationDefinition,
  PresentationResponse
} from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";
import { JWTInvalid } from "jose/errors";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { TrustAnchor } from "../model.js";
import {
  cachedStatusCredentials,
  evaluatePresentationResponseValidity,
  getStatusCredential,
  validateField,
  verifyCredentialStatusValidity,
  verifyCredentialValidity,
  verifyPresentationValidity
} from "./presentation.js";

describe("Presentation Verification", () => {
  let server: SetupServer;

  beforeAll(() => {
    server = setupServer(
      http.get("http://localhost/statusList", () => {
        return HttpResponse.json({
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/security/data-integrity/v2",
            "https://www.w3.org/ns/credentials/status/v1"
          ],
          type: ["VerifiableCredential", "BitstringStatusListCredential"],
          id: "http://localhost/statusList",
          issuer: "did:web:localhost",
          issuanceDate: "2025-02-28T10:47:54.426Z",
          expirationDate: "2099-05-28T09:47:54.426Z",
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

  describe("validateField", () => {
    it("should validate a field that exists and matches filter", () => {
      const fieldDescriptor = {
        name: "test-field",
        path: ["$.testField"],
        filter: {
          type: "string",
          pattern: "^test-value$"
        }
      };
      const vpJson = { testField: "test-value" };
      const result = validateField(fieldDescriptor, vpJson, false);
      expect(result.error).toBe(false);
      expect(result.found).toBe(true);
      expect(result.validated).toBe(true);
    });

    it("should handle optional fields that don't exist", () => {
      const fieldDescriptor = {
        name: "optional-field",
        path: ["$.nonExistentField"],
        optional: true
      };
      const vpJson = { testField: "test-value" };
      const result = validateField(fieldDescriptor, vpJson, false);
      expect(result.error).toBe(false);
      expect(result.found).toBe(false);
      expect(result.validated).toBe(false);
    });

    it("should return error for required fields that don't exist", () => {
      const fieldDescriptor = {
        name: "required-field",
        path: ["$.nonExistentField"]
      };
      const vpJson = { testField: "test-value" };
      const result = validateField(fieldDescriptor, vpJson, false);
      expect(result.error).toBe(true);
      expect(result.found).toBe(false);
    });

    it("should validate array fields", () => {
      const fieldDescriptor: Field = {
        name: "array-field",
        path: ["$.arrayField"],
        filter: {
          type: "array",
          items: {}
        }
      };
      const vpJson = { arrayField: ["test1", "test2"] };
      const result = validateField(fieldDescriptor, vpJson, false);
      expect(result.error).toBe(false);
      expect(result.found).toBe(true);
      expect(result.validated).toBe(true);
    });

    it("should throw error for required fields that don't exist when throwOnError is true", () => {
      const fieldDescriptor = {
        name: "required-field",
        path: ["$.nonExistentField"]
      };
      const vpJson = { testField: "test-value" };
      expect(() => validateField(fieldDescriptor, vpJson, true)).toThrow(
        AppError
      );
    });
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

  describe("verifyCredentialValidity", () => {
    it("should verify valid credential", async () => {
      const credential: VerifiableCredential<
        DataIntegrityProof,
        CredentialSubject
      > = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "TestCredential"],
        issuer: "did:web:localhost",
        expirationDate: new Date(Date.now() + 86400000).toISOString(),
        credentialSubject: {
          id: "did:web:localhost"
        },
        proof: {
          type: "DataIntegrityProof",
          proofPurpose: "assertionMethod",
          verificationMethod: "did:web:localhost#key-0",
          cryptosuite: "eddsa-rdfc-2022",
          created: "2023-01-01T00:00:00Z",
          proofValue:
            "z49zVbm5JEn71f4gNY9gbvneQddR5yb2ZoC5R4RjZM1kGotYzh5sVxWAKvsZRJ74uRcixm8B9rNTkSbetHNYpXBdw"
        }
      };

      const trustAnchors: TrustAnchor[] = [
        {
          identifier: "did:web:localhost",
          credentialTypes: ["TestCredential"]
        }
      ];

      const result = await verifyCredentialValidity(credential, trustAnchors);

      expect(result.validExpiryDate).toBe(true);
      expect(result.validTrustAnchors).toBe(true);
    });

    it("should handle expired credential", async () => {
      const credential: VerifiableCredential<
        DataIntegrityProof,
        CredentialSubject
      > = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "TestCredential"],
        issuer: "did:web:localhost",
        expirationDate: new Date(Date.now() - 86400000).toISOString(),
        credentialSubject: {
          id: "did:web:localhost"
        },
        proof: {
          type: "DataIntegrityProof",
          proofPurpose: "assertionMethod",
          verificationMethod: "did:web:localhost#key-0",
          created: "2023-01-01T00:00:00Z",
          cryptosuite: "eddsa-rdfc-2022",
          proofValue:
            "z49zVbm5JEn71f4gNY9gbvneQddR5yb2ZoC5R4RjZM1kGotYzh5sVxWAKvsZRJ74uRcixm8B9rNTkSbetHNYpXBdw"
        }
      };

      const trustAnchors: TrustAnchor[] = [
        {
          identifier: "did:web:localhost",
          credentialTypes: ["TestCredential"]
        }
      ];

      const result = await verifyCredentialValidity(credential, trustAnchors);

      expect(result.validExpiryDate).toBe(false);
    });
  });

  describe("verifyPresentationValidity", () => {
    it("should verify presentation validity with audience", async () => {
      // Mock JWT with minimal valid structure
      const vpJwt = {
        vp: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0I2tleS0wIn0.eyJhdWQiOiJkaWQ6d2ViOnRlc3QuY29tIiwiZXhwIjo0MTAyNDQ0ODAwLCJ2cCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVQcmVzZW50YXRpb24iXSwidmVyaWZpYWJsZUNyZWRlbnRpYWwiOlt7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJUZXN0Q3JlZGVudGlhbCJdLCJpc3N1ZXIiOiJkaWQ6d2ViOmxvY2FsaG9zdCIsImV4cGlyYXRpb25EYXRlIjoiMjA5OS0wMS0wMVQwMDowMDowMFoifV19fQ.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      };

      const trustAnchors: TrustAnchor[] = [
        {
          identifier: "did:web:localhost",
          credentialTypes: ["TestCredential"]
        }
      ];

      const result = await verifyPresentationValidity(
        vpJwt,
        trustAnchors,
        "did:web:test.com"
      );

      // JWT signature validation will fail because we're using a dummy token
      expect(result.validateJWTSignature).toBe(false);

      // But we can still test the other parts of the validation
      expect(result.validateJWTExpiryDate).toBe(true);
      expect(result.validateAudience).toBe(true);
    });
  });

  describe("evaluatePresentationResponseValidity", () => {
    it("should throw JWTInvalid for invalid JWT", async () => {
      const definition = plainToInstance(PresentationDefinition, {
        id: "test-def",
        input_descriptors: [
          {
            id: "test-descriptor",
            name: "Test Descriptor",
            constraints: {
              fields: [
                {
                  name: "test-field",
                  path: ["$.testField"]
                }
              ]
            }
          }
        ]
      });

      const response = plainToInstance(PresentationResponse, {
        vp_token: "invalid-token",
        presentation_submission: {
          id: "test-submission",
          definition_id: "test-def",
          descriptor_map: [
            {
              id: "test-descriptor",
              format: "jwt_vp",
              path: "$.verifiableCredential[0]"
            }
          ]
        }
      });

      const trustAnchors: TrustAnchor[] = [];

      await expect(
        evaluatePresentationResponseValidity(definition, response, trustAnchors)
      ).rejects.toThrow(JWTInvalid);
    });
  });
});
