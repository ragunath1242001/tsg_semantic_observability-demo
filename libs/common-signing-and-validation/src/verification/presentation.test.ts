import { describe, expect, it } from "@jest/globals";
import {
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import { DcqlQuery, OID4VPAuthorizationResponse } from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";
import { JWK } from "jose";
import { JWTInvalid } from "jose/errors";

import { TrustAnchor } from "../model.js";
import { generateSignedJwt } from "../signing/sign.js";
import {
  evaluatePresentationResponseValidity,
  verifyPresentationValidity
} from "./presentation.js";

describe("Presentation Verification", () => {
  describe("verifyPresentationValidity", () => {
    it("should throw an error for invalid VerifiablePresentation format", async () => {
      const vpJwt = {
        vp: "invalid.jwt.token"
      };

      const trustAnchors: TrustAnchor[] = [];

      await expect(
        verifyPresentationValidity(vpJwt, trustAnchors)
      ).rejects.toThrow("Failed to parse the decoded payload as JSON");

      const vpJwt2 = {
        vp: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0I2tleS0wIn0.e30.Lw50KYuepySKEJKwSucZoXOdWQEkN-qSiyVjbdfm4_Ol287fFfEq37HY07C0xNFu749BrYK7xDvm7cXl-fc2Dg"
      };
      await expect(
        verifyPresentationValidity(vpJwt2, trustAnchors)
      ).rejects.toThrow("Invalid VerifiablePresentation");
    });
    describe("Presentation formats", () => {
      it("should verify enveloped presentation validity", async () => {
        const vpJwt = {
          vp: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0I2tleS0wIn0.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwiaWQiOiJkYXRhOmFwcGxpY2F0aW9uL3ZwK2p3dCxleUpoYkdjaU9pSkZaRVJUUVNJc0ltdHBaQ0k2SW1ScFpEcDNaV0k2Ykc5allXeG9iM04wSTJ0bGVTMHdJbjAuZXlKaGRXUWlPaUprYVdRNmQyVmlPblJsYzNRdVkyOXRJaXdpWlhod0lqbzBNVEF5TkRRME9EQXdMQ0pBWTI5dWRHVjRkQ0k2V3lKb2RIUndjem92TDNkM2R5NTNNeTV2Y21jdmJuTXZZM0psWkdWdWRHbGhiSE12ZGpJaVhTd2lkSGx3WlNJNld5SldaWEpwWm1saFlteGxVSEpsYzJWdWRHRjBhVzl1SWwwc0luWmxjbWxtYVdGaWJHVkRjbVZrWlc1MGFXRnNJanBiZXlKQVkyOXVkR1Y0ZENJNld5Sm9kSFJ3Y3pvdkwzZDNkeTUzTXk1dmNtY3Zibk12WTNKbFpHVnVkR2xoYkhNdmRqSWlYU3dpZEhsd1pTSTZXeUpXWlhKcFptbGhZbXhsUTNKbFpHVnVkR2xoYkNJc0lsUmxjM1JEY21Wa1pXNTBhV0ZzSWwwc0ltbHpjM1ZsY2lJNkltUnBaRHAzWldJNmJHOWpZV3hvYjNOMElpd2laWGh3YVhKaGRHbHZia1JoZEdVaU9pSXlNRGs1TFRBeExUQXhWREF3T2pBd09qQXdXaUo5WFgwLnFtVWZ6U2lja0VIUlZWUkRqYXptb0NpQjFlSjgtWFViUDJvdG1TaUFDV1RXcy10WkZrVnZFOGt3dnFDWWF2WmpZQnhndWhCQU1paGJoek0wS0xxSkF3IiwidHlwZSI6IkVudmVsb3BlZFZlcmlmaWFibGVQcmVzZW50YXRpb24iLCJhdWQiOiJkaWQ6d2ViOnRlc3QuY29tIiwiZXhwIjo0MTAyNDQ0ODAwfQ.06Pl5MQU1btRgi6-9O76OYH1baYzGIt2pDBYDSel0LIZnj8EM-ZJPrgc4g0ICEVI6Uzhzez9EOmnZ-Yr36FDBA"
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
        // JWT signature validation will fail because we're using a dummy signature
        expect(result.validateJWTSignature).toBe(false);

        // But we can still test the other parts of the validation
        expect(result.validateJWTExpiryDate).toBe(true);
        expect(result.validateAudience).toBe(true);
      });
      it("should throw an error for invalid enveloped presentation", async () => {
        const vpJwt = {
          vp: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0I2tleS0wIn0.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwiaWQiOiJ0ZXN0IiwidHlwZSI6IkVudmVsb3BlZFZlcmlmaWFibGVQcmVzZW50YXRpb24iLCJhdWQiOiJkaWQ6d2ViOnRlc3QuY29tIiwiZXhwIjo0MTAyNDQ0ODAwfQ.YUCWCoIZOi0nFUCgIH9dhsEFfPN5Ap8wps5RQ5cPjmeYCbtLDcf5rbWghlTQ67bJlV2KQjsjfuTsjXKp6AAiBQ"
        };

        const trustAnchors: TrustAnchor[] = [];

        await expect(
          verifyPresentationValidity(vpJwt, trustAnchors)
        ).rejects.toThrow("Invalid EnvelopedVerifiablePresentation id");
      });
      it("should verify VP Jose JWT presentation validity with audience", async () => {
        // Mock JWT with minimal valid structure
        const vpJwt = {
          vp: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0I2tleS0wIn0.eyJhdWQiOiJkaWQ6d2ViOnRlc3QuY29tIiwiZXhwIjo0MTAyNDQ0ODAwLCJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwidHlwZSI6WyJWZXJpZmlhYmxlUHJlc2VudGF0aW9uIl0sInZlcmlmaWFibGVDcmVkZW50aWFsIjpbeyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIlRlc3RDcmVkZW50aWFsIl0sImlzc3VlciI6ImRpZDp3ZWI6bG9jYWxob3N0IiwiZXhwaXJhdGlvbkRhdGUiOiIyMDk5LTAxLTAxVDAwOjAwOjAwWiJ9XX0.qmUfzSickEHRVVRDjazmoCiB1eJ8-XUbP2otmSiACWTWs-tZFkVvE8kwvqCYavZjYBxguhBAMihbhzM0KLqJAw"
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
        // JWT signature validation will fail because we're using a dummy signature
        expect(result.validateJWTSignature).toBe(false);

        // But we can still test the other parts of the validation
        expect(result.validateJWTExpiryDate).toBe(true);
        expect(result.validateAudience).toBe(true);
      });
      it("should verify VP identity foundation JWT presentation validity with audience", async () => {
        // Mock JWT with minimal valid structure
        const vpJwt = {
          vp: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0I2tleS0wIn0.eyJhdWQiOiJkaWQ6d2ViOnRlc3QuY29tIiwiZXhwIjo0MTAyNDQ0ODAwLCJ2cCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwidHlwZSI6WyJWZXJpZmlhYmxlUHJlc2VudGF0aW9uIl0sInZlcmlmaWFibGVDcmVkZW50aWFsIjpbeyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIlRlc3RDcmVkZW50aWFsIl0sImlzc3VlciI6ImRpZDp3ZWI6bG9jYWxob3N0IiwiZXhwaXJhdGlvbkRhdGUiOiIyMDk5LTAxLTAxVDAwOjAwOjAwWiJ9XX19.lNdWWQwvKFaF0PSNFfIdze0eWZLAP2ocWWp8YvcwCcnqgld9G2hZiGVSDHyiB3xZTS1mX1PQWLfxqlaHGiz9BA"
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

        // JWT signature validation will fail because we're using a dummy signature
        expect(result.validateJWTSignature).toBe(false);

        // But we can still test the other parts of the validation
        expect(result.validateJWTExpiryDate).toBe(true);
        expect(result.validateAudience).toBe(true);
      });
    });
    describe("Verify JWT claims", () => {
      const privateJwk: JWK = {
        crv: "Ed25519",
        d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo",
        x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
        kty: "OKP"
      };
      const publicKeyMultibase =
        "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz";
      const testPresentation: VerifiablePresentation = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [
          {
            "@context": ["https://www.w3.org/ns/credentials/v2"],
            type: ["VerifiableCredential", "TestCredential"],
            issuer: "did:web:localhost",
            expirationDate: "2099-01-01T00:00:00Z"
          } as unknown as VerifiableCredential
        ]
      };
      it("should validate audience claim", async () => {
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            audience: "aud-1",
            iss: true,
            expiresIn: 60,
            subject: "sub-1",
            jti: crypto.randomUUID()
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(
          vpJwt,
          trustAnchors,
          "aud-1"
        );
        expect(result.validateAudience).toBe(true);
        expect(result.validateJWTSignature).toBe(true);
      });
      it("should validate audience claim", async () => {
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            expiresIn: 60,
            subject: "sub-1",
            jti: crypto.randomUUID()
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(vpJwt, trustAnchors);
        expect(result.validateAudience).toBeUndefined();
        expect(result.validateJWTSignature).toBe(true);
        const result2 = await verifyPresentationValidity(
          vpJwt,
          trustAnchors,
          "wrong-audience"
        );
        expect(result2.validateAudience).toBe(false);
      });
      it("should validate expiry date claim", async () => {
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            expiresIn: 60,
            subject: "sub-1",
            jti: crypto.randomUUID()
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(vpJwt, trustAnchors);
        expect(result.validateJWTExpiryDate).toBe(true);
      });
      it("should validate with missing expiry date claim", async () => {
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            subject: "sub-1",
            jti: crypto.randomUUID()
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(vpJwt, trustAnchors);
        expect(result.validateJWTExpiryDate).toBe(true);
      });
      it("should error on expired JWT", async () => {
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            expiresIn: -60, // Expired JWT
            subject: "sub-1",
            jti: crypto.randomUUID()
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(vpJwt, trustAnchors);
        expect(result.validateJWTSignature).toBe(false);
      });
      it("should validate nonce claim", async () => {
        const nonce = "test-nonce";
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            expiresIn: 60,
            subject: "sub-1",
            jti: crypto.randomUUID(),
            nonce
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(
          vpJwt,
          trustAnchors,
          undefined,
          nonce
        );
        expect(result.validateNonce).toBe(true);
      });
      it("should validate nonce claim with undefined nonce", async () => {
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            expiresIn: 60,
            subject: "sub-1",
            jti: crypto.randomUUID()
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(vpJwt, trustAnchors);
        expect(result.validateNonce).toBeUndefined();
      });
      it("should validate nonce claim with mismatched nonce", async () => {
        const nonce = "test-nonce";
        const signedJwt = await generateSignedJwt(
          testPresentation,
          `did:key:${publicKeyMultibase}`,
          {
            key: {
              identifier: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            expiresIn: 60,
            subject: "sub-1",
            jti: crypto.randomUUID(),
            nonce
          }
        );
        const vpJwt = {
          vp: signedJwt
        };
        const trustAnchors: TrustAnchor[] = [];
        const result = await verifyPresentationValidity(
          vpJwt,
          trustAnchors,
          undefined,
          "wrong-nonce"
        );
        expect(result.validateNonce).toBe(false);
      });
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
});
