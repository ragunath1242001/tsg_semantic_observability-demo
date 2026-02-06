import {
  CredentialContainer,
  formatCredential,
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  ClaimsQuery,
  CredentialQuery,
  CredentialSetQuery
} from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";

import { TrustAnchor } from "../model.js";
import {
  validateClaims,
  validateClaimSets,
  validateCredentialSets,
  validateDcqlConstraints,
  validateFormatConstraints,
  validateTrustedAuthorities
} from "./dcql-constraints.js";

describe("DCQL Constraints", () => {
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
      const validCredential = formatCredential({
        vct: "https://credentials.example.com/identity",
        iss: "https://issuer.example.com",
        iat: Date.now() / 1000
      } as unknown as VerifiableCredential);

      expect(() =>
        validateFormatConstraints(credentialQuery, validCredential)
      ).not.toThrow();

      // Test invalid vct value
      const invalidCredential = formatCredential({
        vct: "https://credentials.example.com/invalid",
        iss: "https://issuer.example.com",
        iat: Date.now() / 1000
      } as unknown as VerifiableCredential);

      expect(() =>
        validateFormatConstraints(credentialQuery, invalidCredential)
      ).toThrow(
        "Credential vct https://credentials.example.com/invalid not in allowed values"
      );

      // Test missing vct value
      const missingVctCredential = formatCredential({
        iss: "https://issuer.example.com",
        iat: Date.now() / 1000
      } as unknown as VerifiableCredential);

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
      const validCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential", "IdentityCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        })
      );

      expect(() =>
        validateFormatConstraints(credentialQuery, validCredential)
      ).not.toThrow();

      // Test invalid type combination
      const invalidCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential", "InvalidCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        })
      );

      expect(() =>
        validateFormatConstraints(credentialQuery, invalidCredential)
      ).toThrow(
        "Credential types VerifiableCredential, InvalidCredential do not match allowed types"
      );

      // Test missing type
      const missingTypeCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        })
      );

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
      const validCredential = formatCredential({
        doctype: "org.iso.18013.5.1.mDL",
        version: "1.0"
      } as unknown as VerifiableCredential);

      expect(() =>
        validateFormatConstraints(credentialQuery, validCredential)
      ).not.toThrow();

      // Test invalid doctype
      const invalidCredential = formatCredential({
        doctype: "org.iso.18013.5.1.invalid",
        version: "1.0"
      } as unknown as VerifiableCredential);

      expect(() =>
        validateFormatConstraints(credentialQuery, invalidCredential)
      ).toThrow(
        "Credential doctype org.iso.18013.5.1.invalid does not match required org.iso.18013.5.1.mDL"
      );

      // Test missing doctype
      const missingDoctypeCredential = formatCredential({
        version: "1.0"
      } as unknown as VerifiableCredential);

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

      const credential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        })
      );

      const validTrustAnchors: TrustAnchor[] = [
        {
          id: "https://federation.example.com",
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
          id: "https://different-federation.example.com",
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

      const credential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: { id: "did:example:123" }
        })
      );

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

      const validCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe",
            age: 30
          }
        })
      );

      expect(() => validateClaims(claims, validCredential)).not.toThrow();

      // Test with invalid claim value
      const invalidValueCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "Invalid Name",
            age: 30
          }
        })
      );

      expect(() => validateClaims(claims, invalidValueCredential)).toThrow(
        "Claim value Invalid Name not in expected values: John Doe, Jane Smith"
      );

      // Test with missing required claim
      const missingClaimCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
            // Missing age claim
          }
        })
      );

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

      const validCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            address: {
              street: "123 Main St",
              city: "Example City"
            }
          }
        })
      );

      expect(() => validateClaims(claims, validCredential)).not.toThrow();

      // Test with missing nested claim
      const missingNestedCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            address: {
              city: "Example City"
              // Missing street
            }
          }
        })
      );

      expect(() => validateClaims(claims, missingNestedCredential)).toThrow(
        "Required claim at path credentialSubject.address.street not found in credential"
      );
    });

    it("should handle claims path with array elements", () => {
      const claims = [
        {
          path: ["credentialSubject", "addresses", null, "street"]
        }
      ] as ClaimsQuery[];

      const validCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            addresses: [
              { street: "123 Main St", city: "Example City" },
              { street: "456 Oak Ave", city: "Another City" }
            ]
          }
        })
      );
      expect(() => validateClaims(claims, validCredential)).not.toThrow();

      const claimsSpecific = [
        {
          path: ["credentialSubject", "addresses", 1, "street"],
          values: ["456 Oak Ave"]
        }
      ] as ClaimsQuery[];

      expect(() =>
        validateClaims(claimsSpecific, validCredential)
      ).not.toThrow();
    });
    it("should throw for claims with incorrect values", () => {
      const claims = [
        { path: ["credentialSubject", null, "name"], values: ["John Doe"] }
      ] as ClaimsQuery[];
      const invalidCredential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: ["Jane Doe", "John Smith"]
          }
        })
      );
      expect(() => validateClaims(claims, invalidCredential)).toThrow(
        "Required claim at path credentialSubject..name not found in credential"
      );

      const claimsWithIncorrectIndex = [
        {
          path: ["credentialSubject", "name", "1"],
          values: ["John Smith"]
        }
      ];
      expect(() =>
        validateClaims(claimsWithIncorrectIndex, invalidCredential)
      ).toThrow(
        "Required claim at path credentialSubject.name.1 not found in credential"
      );

      const claimsWithIndexOutOfBounds = [
        {
          path: ["credentialSubject", "name", 10],
          values: ["John Smith"]
        }
      ];
      expect(() =>
        validateClaims(claimsWithIndexOutOfBounds, invalidCredential)
      ).toThrow(
        "Required claim at path credentialSubject.name.10 not found in credential"
      );

      const claimsWithIndexOutOfBounds2 = [
        {
          path: ["credentialSubject", "name", -1],
          values: ["John Smith"]
        }
      ];
      expect(() =>
        validateClaims(claimsWithIndexOutOfBounds2, invalidCredential)
      ).toThrow(
        "Required claim at path credentialSubject.name.-1 not found in credential"
      );
    });
    it("should throw on empty credential", () => {
      const claims = [
        {
          path: ["credentialSubject", "name"],
          values: ["John Doe", "Jane Smith"]
        }
      ] as ClaimsQuery[];
      const nullCredential: CredentialContainer = {
        credential: null as unknown as VerifiableCredential
      };
      expect(() => validateClaims(claims, nullCredential)).toThrow(
        "Required claim at path credentialSubject.name not found in credential"
      );
      const undefinedCredential: CredentialContainer = {
        credential: null as unknown as VerifiableCredential
      };
      expect(() => validateClaims(claims, undefinedCredential)).toThrow(
        "Required claim at path credentialSubject.name not found in credential"
      );
    });
  });

  describe("validateClaimSets", () => {
    it("should pass if at least one claim set is satisfied", () => {
      const claimSets: string[][] = [
        ["credentialSubject.id", "credentialSubject.name"],
        ["credentialSubject.email"]
      ];
      const credential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        })
      );
      expect(() => validateClaimSets(claimSets, credential)).not.toThrow();
    });
    it("should throw if no claim set is satisfied", () => {
      const claimSets: string[][] = [
        ["credentialSubject.email"],
        ["credentialSubject.phone"]
      ];
      const credential = formatCredential(
        plainToInstance(VerifiableCredential, {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential"],
          issuer: "https://issuer.example.com",
          validFrom: "2023-01-01T00:00:00Z",
          credentialSubject: {
            id: "did:example:123",
            name: "John Doe"
          }
        })
      );
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
    const validCredential = plainToInstance(VerifiableCredential, {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "IdentityCredential"],
      issuer: "https://issuer.example.com",
      validFrom: "2023-01-01T00:00:00Z",
      credentialSubject: {
        id: "did:example:123",
        name: "John Doe"
      }
    });
    const vp = plainToInstance(VerifiablePresentation, {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [validCredential],
      holder: "did:example:holder123"
    });
    const trustAnchors: TrustAnchor[] = [
      {
        id: "https://federation.example.com",
        credentialTypes: ["IdentityCredential"]
      }
    ];
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

      expect(() =>
        validateDcqlConstraints(credentialQuery, vp, trustAnchors)
      ).not.toThrow();
    });
    it("should validate DCQL query without meta constraints", () => {
      const credentialQuery = plainToInstance(CredentialQuery, {
        id: "test_credential",
        format: "jwt_vc_json",
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
      expect(() =>
        validateDcqlConstraints(credentialQuery, vp, trustAnchors)
      ).not.toThrow();
    });
    it("should validate DCQL query with claim sets", () => {
      const credentialQuery = plainToInstance(CredentialQuery, {
        id: "test_credential",
        format: "jwt_vc_json",
        claim_sets: [
          ["credentialSubject.id", "credentialSubject.name"],
          ["credentialSubject.email"]
        ]
      });
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
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiableCredential", "WrongCredential"],
        issuer: "https://issuer.example.com",
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:123",
          name: "John Doe"
        }
      });
      const vp = plainToInstance(VerifiablePresentation, {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
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
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiableCredential", "IdentityCredential"],
        issuer: "https://issuer.example.com",
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:123",
          name: "John Doe"
        }
      });
      const credential2 = plainToInstance(VerifiableCredential, {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiableCredential", "IdentityCredential"],
        issuer: "https://issuer.example.com",
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:456",
          name: "Jane Smith"
        }
      });
      const vp = plainToInstance(VerifiablePresentation, {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
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
