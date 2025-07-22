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
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  ClaimsQuery,
  CredentialQuery,
  CredentialSetQuery,
  DcqlQuery,
  Field,
  OID4VPAuthorizationResponse
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
  validateClaims,
  validateClaimSets,
  validateCredentialSets,
  validateDcqlConstraints,
  validateField,
  validateFormatConstraints,
  validateTrustedAuthorities,
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
      const dcqlQuery = plainToInstance(DcqlQuery, {
        credentials: [
          {
            id: "identity_credential",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["https://credentials.example.com/identity"]
            },
            claims: [
              {
                path: ["credentialSubject", "familyName"]
              }
            ]
          }
        ]
      });

      const response = plainToInstance(OID4VPAuthorizationResponse, {
        vp_token: {
          identity_credential: ["invalid-token"]
        },
        state: "test-state"
      });

      const trustAnchors: TrustAnchor[] = [];

      await expect(
        evaluatePresentationResponseValidity(dcqlQuery, response, trustAnchors)
      ).rejects.toThrow(JWTInvalid);
    });

    it("should throw AppError when required credential is missing", async () => {
      const dcqlQuery = plainToInstance(DcqlQuery, {
        credentials: [
          {
            id: "missing_credential",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["https://credentials.example.com/identity"]
            }
          }
        ]
      });

      const response = plainToInstance(OID4VPAuthorizationResponse, {
        vp_token: {
          identity_credential: ["some-token"]
        },
        state: "test-state"
      });

      const trustAnchors: TrustAnchor[] = [];

      await expect(
        evaluatePresentationResponseValidity(dcqlQuery, response, trustAnchors)
      ).rejects.toThrow(
        "No VP tokens found for credential query missing_credential"
      );
    });

    it("should handle empty VP tokens array", async () => {
      const dcqlQuery = plainToInstance(DcqlQuery, {
        credentials: [
          {
            id: "empty_credential",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["https://credentials.example.com/identity"]
            }
          }
        ]
      });

      const response = plainToInstance(OID4VPAuthorizationResponse, {
        vp_token: {
          empty_credential: []
        },
        state: "test-state"
      });

      const trustAnchors: TrustAnchor[] = [];

      await expect(
        evaluatePresentationResponseValidity(dcqlQuery, response, trustAnchors)
      ).rejects.toThrow(
        "No VP tokens found for credential query empty_credential"
      );
    });
  });

  describe("Isolated DCQL Constraint Validation", () => {
    describe("validateFormatConstraints", () => {
      it("should validate SD-JWT VC vct_values constraints", () => {
        const credentialQuery = plainToInstance(CredentialQuery, {
          id: "test_credential",
          format: "dc+sd-jwt",
          meta: {
            vct_values: [
              "https://credentials.example.com/identity",
              "https://credentials.example.com/address"
            ]
          }
        });

        // Test valid vct value
        const validCredential = {
          vct: "https://credentials.example.com/identity",
          iss: "https://issuer.example.com",
          iat: Date.now() / 1000
        } as unknown as VerifiableCredential;

        expect(() =>
          validateFormatConstraints(credentialQuery, validCredential)
        ).not.toThrow();

        // Test invalid vct value
        const invalidCredential = {
          vct: "https://credentials.example.com/invalid",
          iss: "https://issuer.example.com",
          iat: Date.now() / 1000
        } as unknown as VerifiableCredential;

        expect(() =>
          validateFormatConstraints(credentialQuery, invalidCredential)
        ).toThrow(
          "Credential vct https://credentials.example.com/invalid not in allowed values"
        );

        // Test missing vct value
        const missingVctCredential = {
          iss: "https://issuer.example.com",
          iat: Date.now() / 1000
        } as unknown as VerifiableCredential;

        expect(() =>
          validateFormatConstraints(credentialQuery, missingVctCredential)
        ).toThrow("Credential vct undefined not in allowed values");
      });

      it("should validate W3C VC type_values constraints", () => {
        const credentialQuery = plainToInstance(CredentialQuery, {
          id: "test_credential",
          format: "jwt_vc_json",
          meta: {
            type_values: [
              ["VerifiableCredential", "IdentityCredential"],
              ["VerifiableCredential", "AddressCredential"]
            ]
          }
        });

        // Test valid type combination
        const validCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "IdentityCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        });

        expect(() =>
          validateFormatConstraints(credentialQuery, validCredential)
        ).not.toThrow();

        // Test invalid type combination
        const invalidCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "InvalidCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        });

        expect(() =>
          validateFormatConstraints(credentialQuery, invalidCredential)
        ).toThrow(
          "Credential types VerifiableCredential, InvalidCredential do not match allowed types"
        );

        // Test missing type
        const missingTypeCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        });

        expect(() =>
          validateFormatConstraints(credentialQuery, missingTypeCredential)
        ).toThrow("Credential types  do not match allowed types");
      });

      it("should validate mDoc doctype_value constraints", () => {
        const credentialQuery = plainToInstance(CredentialQuery, {
          id: "test_credential",
          format: "mso_mdoc",
          meta: {
            doctype_value: "org.iso.18013.5.1.mDL"
          }
        });

        // Test valid doctype
        const validCredential = {
          doctype: "org.iso.18013.5.1.mDL",
          version: "1.0"
        } as unknown as VerifiableCredential;

        expect(() =>
          validateFormatConstraints(credentialQuery, validCredential)
        ).not.toThrow();

        // Test invalid doctype
        const invalidCredential = {
          doctype: "org.iso.18013.5.1.invalid",
          version: "1.0"
        } as unknown as VerifiableCredential;

        expect(() =>
          validateFormatConstraints(credentialQuery, invalidCredential)
        ).toThrow(
          "Credential doctype org.iso.18013.5.1.invalid does not match required org.iso.18013.5.1.mDL"
        );

        // Test missing doctype
        const missingDoctypeCredential = {
          version: "1.0"
        } as unknown as VerifiableCredential;

        expect(() =>
          validateFormatConstraints(credentialQuery, missingDoctypeCredential)
        ).toThrow(
          "Credential doctype undefined does not match required org.iso.18013.5.1.mDL"
        );
      });
    });

    describe("validateTrustedAuthorities", () => {
      it("should validate OpenID Federation trusted authorities", () => {
        const trustedAuthorities = [
          {
            type: "openid_federation" as const,
            values: [
              "https://federation.example.com",
              "https://another-federation.example.com"
            ]
          }
        ];

        const credential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        });

        const validTrustAnchors: TrustAnchor[] = [
          {
            identifier: "https://federation.example.com",
            credentialTypes: ["VerifiableCredential"]
          }
        ];

        expect(() =>
          validateTrustedAuthorities(
            trustedAuthorities,
            credential,
            validTrustAnchors
          )
        ).not.toThrow();

        // Test with no matching trust anchors
        const emptyTrustAnchors: TrustAnchor[] = [];

        expect(() =>
          validateTrustedAuthorities(
            trustedAuthorities,
            credential,
            emptyTrustAnchors
          )
        ).toThrow(
          "No trusted federation anchor found for issuer https://issuer.example.com"
        );

        // Test with non-matching trust anchors
        const nonMatchingTrustAnchors: TrustAnchor[] = [
          {
            identifier: "https://different-federation.example.com",
            credentialTypes: ["VerifiableCredential"]
          }
        ];

        expect(() =>
          validateTrustedAuthorities(
            trustedAuthorities,
            credential,
            nonMatchingTrustAnchors
          )
        ).toThrow(
          "No trusted federation anchor found for issuer https://issuer.example.com"
        );
      });

      it("should throw for unsupported trusted authority types", () => {
        const trustedAuthorities = [
          {
            type: "etsi_tl" as const,
            values: ["https://etsi.example.com"]
          }
        ];

        const credential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        });

        expect(() =>
          validateTrustedAuthorities(trustedAuthorities, credential, [])
        ).toThrow("ETSI Trust List validation not yet implemented");

        const akiAuthorities = [
          {
            type: "aki" as const,
            values: ["keyid:123456"]
          }
        ];

        expect(() =>
          validateTrustedAuthorities(akiAuthorities, credential, [])
        ).toThrow("AKI validation not yet implemented");

        const unknownAuthorities = [
          {
            type: "unknown",
            values: ["value"]
          }
        ];

        expect(() =>
          validateTrustedAuthorities(unknownAuthorities, credential, [])
        ).toThrow("Unknown trusted authority type: unknown");
      });
    });

    describe("validateClaims", () => {
      it("should validate required claims with correct values", () => {
        const claims = [
          {
            path: ["credentialSubject", "name"],
            values: ["John Doe", "Jane Smith"]
          },
          {
            path: ["credentialSubject", "age"]
            // No values specified, just check existence
          }
        ] as ClaimsQuery[];

        const validCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe",
            age: 30
          }
        });

        expect(() => validateClaims(claims, validCredential)).not.toThrow();

        // Test with invalid claim value
        const invalidValueCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "Invalid Name",
            age: 30
          }
        });

        expect(() => validateClaims(claims, invalidValueCredential)).toThrow(
          "Claim value Invalid Name not in expected values: John Doe, Jane Smith"
        );

        // Test with missing required claim
        const missingClaimCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
            // Missing age claim
          }
        });

        expect(() => validateClaims(claims, missingClaimCredential)).toThrow(
          "Required claim at path credentialSubject.age not found in credential"
        );
      });

      it("should handle complex claim paths", () => {
        const claims = [
          {
            path: ["credentialSubject", "address", "street"],
            values: ["123 Main St", "456 Oak Ave"]
          }
        ];

        const validCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            address: {
              street: "123 Main St",
              city: "Example City"
            }
          }
        });

        expect(() => validateClaims(claims, validCredential)).not.toThrow();

        // Test with missing nested claim
        const missingNestedCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            address: {
              city: "Example City"
              // Missing street
            }
          }
        });

        expect(() => validateClaims(claims, missingNestedCredential)).toThrow(
          "Required claim at path credentialSubject.address.street not found in credential"
        );
      });
    });

    describe("validateClaimSets", () => {
      it("should pass if at least one claim set is satisfied", () => {
        const claimSets: string[][] = [
          ["credentialSubject.id", "credentialSubject.name"],
          ["credentialSubject.email"]
        ];
        const credential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        });
        expect(() => validateClaimSets(claimSets, credential)).not.toThrow();
      });
      it("should throw if no claim set is satisfied", () => {
        const claimSets: string[][] = [
          ["credentialSubject.email"],
          ["credentialSubject.phone"]
        ];
        const credential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        });
        expect(() => validateClaimSets(claimSets, credential)).toThrow(
          "No claim set satisfied by the credential"
        );
      });
    });

    describe("validateCredentialSets", () => {
      it("should pass if at least one option is satisfied", () => {
        const credentialSets: CredentialSetQuery[] = [
          {
            required: true,
            options: [["cred1"], ["cred2", "cred3"]]
          } as CredentialSetQuery
        ];
        const vpToken: Record<string, string[]> = {
          cred1: ["vp1"],
          cred2: [],
          cred3: []
        };
        expect(() =>
          validateCredentialSets(credentialSets, vpToken)
        ).not.toThrow();
      });

      it("should throw if no option is satisfied", () => {
        const credentialSets: CredentialSetQuery[] = [
          {
            required: true,
            options: [["cred1"], ["cred2", "cred3"]]
          } as CredentialSetQuery
        ];
        const vpToken: Record<string, string[]> = {
          cred1: [],
          cred2: [],
          cred3: []
        };
        expect(() => validateCredentialSets(credentialSets, vpToken)).toThrow(
          /Required credential set not satisfied/
        );
      });

      it("should skip non-required credential sets", () => {
        const credentialSets: CredentialSetQuery[] = [
          {
            required: false,
            options: [["cred1"]]
          } as CredentialSetQuery
        ];
        const vpToken: Record<string, string[]> = {
          cred1: []
        };
        expect(() =>
          validateCredentialSets(credentialSets, vpToken)
        ).not.toThrow();
      });
    });

    describe("validateDcqlConstraints", () => {
      it("should validate complete DCQL constraints on a verifiable presentation", () => {
        const credentialQuery = plainToInstance(CredentialQuery, {
          id: "test_credential",
          format: "jwt_vc_json",
          meta: {
            type_values: [["VerifiableCredential", "IdentityCredential"]]
          },
          trusted_authorities: [
            {
              type: "openid_federation",
              values: ["https://federation.example.com"]
            }
          ],
          claims: [
            {
              path: ["credentialSubject", "name"],
              values: ["John Doe"]
            }
          ]
        });

        const validCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "IdentityCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        });

        const vp = plainToInstance(VerifiablePresentation, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [validCredential],
          holder: "did:example:holder123"
        });

        const trustAnchors: TrustAnchor[] = [
          {
            identifier: "https://federation.example.com",
            credentialTypes: ["IdentityCredential"]
          }
        ];

        expect(() =>
          validateDcqlConstraints(credentialQuery, vp, trustAnchors)
        ).not.toThrow();
      });

      it("should fail validation when any constraint is violated", () => {
        const credentialQuery = plainToInstance(CredentialQuery, {
          id: "test_credential",
          format: "jwt_vc_json",
          meta: {
            type_values: [["VerifiableCredential", "IdentityCredential"]]
          },
          claims: [
            {
              path: ["credentialSubject", "name"],
              values: ["John Doe"]
            }
          ]
        });

        // Credential with wrong type
        const invalidCredential = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "WrongCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        });

        const vp = plainToInstance(VerifiablePresentation, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [invalidCredential],
          holder: "did:example:holder123"
        });

        expect(() => validateDcqlConstraints(credentialQuery, vp, [])).toThrow(
          "Credential types VerifiableCredential, WrongCredential do not match allowed types"
        );
      });

      it("should handle multiple credentials in a presentation", () => {
        const credentialQuery = plainToInstance(CredentialQuery, {
          id: "test_credential",
          format: "jwt_vc_json",
          meta: {
            type_values: [["VerifiableCredential", "IdentityCredential"]]
          }
        });

        const credential1 = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "IdentityCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        });

        const credential2 = plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "IdentityCredential"],
          issuer: "https://issuer.example.com",
          issuanceDate: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:456",
            name: "Jane Smith"
          }
        });

        const vp = plainToInstance(VerifiablePresentation, {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [credential1, credential2],
          holder: "did:example:holder123"
        });

        expect(() =>
          validateDcqlConstraints(credentialQuery, vp, [])
        ).not.toThrow();
      });
    });
  });
});
