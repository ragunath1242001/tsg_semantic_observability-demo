import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthorizationRequest,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { AppError } from "@tsg-dsp/common-api";
import {
  CredentialContainer,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { RecoveryCodeService } from "../../auth/recovery-code.service.js";
import { TotpService } from "../../auth/totp.service.js";
import { TwoFactorHelper } from "../../auth/two-factor.helper.js";
import { WebAuthnService } from "../../auth/webauthn.service.js";
import { ClientsService } from "../../clients/clients.service.js";
import { RootConfig } from "../../config.js";
import { KubernetesService } from "../../k8s/kubernetes.service.js";
import { OauthClient } from "../../model/client.dao.js";
import { KeyDao } from "../../model/keys.dao.js";
import { AuthorizationRequestDao } from "../../model/oid4vp.dao.js";
import { RecoveryCode } from "../../model/recovery-code.dao.js";
import { OauthRole } from "../../model/role.dao.js";
import { TokenDao } from "../../model/token.dao.js";
import { TotpCredential } from "../../model/totp-credential.dao.js";
import { OauthUser } from "../../model/user.dao.js";
import { WebAuthnCredential } from "../../model/webauthn-credential.dao.js";
import { OauthService } from "../../oauth/oauth.service.js";
import { TokenService } from "../../oauth/token.service.js";
import { RolesService } from "../../roles/roles.service.js";
import { UsersService } from "../../users/users.service.js";
import { OID4VPVerifierService } from "./verifier.service.js";

describe("OID4VPVerifierService", () => {
  let service: OID4VPVerifierService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          AuthorizationRequestDao,
          OauthUser,
          OauthRole,
          OauthClient,
          TokenDao,
          KeyDao,
          TotpCredential,
          WebAuthnCredential,
          RecoveryCode
        ]),
        TypeOrmModule.forFeature([
          AuthorizationRequestDao,
          OauthUser,
          OauthRole,
          OauthClient,
          TokenDao,
          KeyDao,
          TotpCredential,
          WebAuthnCredential,
          RecoveryCode
        ])
      ],
      providers: [
        OID4VPVerifierService,
        OauthService,
        ClientsService,
        RolesService,
        TokenService,
        UsersService,
        TotpService,
        WebAuthnService,
        RecoveryCodeService,
        TwoFactorHelper,
        {
          provide: KubernetesService,
          useValue: {
            applySecret: vi.fn()
          }
        },
        {
          provide: RootConfig,
          useValue: {
            server: {
              publicAddress: "http://localhost"
            },
            initRoles: [],
            initUsers: [],
            initClients: [],
            dcqlQueryMap: {
              Administrator: {
                credentials: [
                  {
                    id: "identity_credential",
                    format: "dc+sd-jwt",
                    meta: {
                      type_values: [
                        ["VerifiableCredential", "HandsonCredential"]
                      ]
                    },
                    claims: [
                      {
                        id: "email",
                        path: ["credentialSubject", "email"]
                      },
                      {
                        id: "role",
                        path: ["credentialSubject", "role"],
                        values: ["Administrator"]
                      }
                    ]
                  }
                ]
              },
              User: {
                credentials: [
                  {
                    id: "identity_credential",
                    format: "dc+sd-jwt",
                    meta: {
                      type_values: [
                        ["VerifiableCredential", "HandsonCredential"]
                      ]
                    },
                    claims: [
                      {
                        id: "email",
                        path: ["credentialSubject", "email"]
                      }
                    ]
                  }
                ]
              }
            }
          }
        },
        {
          provide: ServerConfig,
          useValue: plainToInstance(ServerConfig, {
            publicAddress: "http://localhost"
          })
        }
      ]
    }).compile();

    service = moduleRef.get<OID4VPVerifierService>(OID4VPVerifierService);
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        return HttpResponse.json();
      }),
      http.get("http://localhost:3000/credentials/status-0", async () => {
        return HttpResponse.json();
      })
    );
    server.listen({ onUnhandledRequest: "warn" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("createAuthorizationRequest", () => {
    it("should call getDcqlQuery successfully", () => {
      // Test just the getDcqlQuery method first
      const result = service["getDcqlQuery"]("User");
      expect(result).toBeDefined();
      expect(result.credentials).toBeDefined();
    });

    it("should create an authorization request without role and return the request URI", async () => {
      const result = await service.createAuthorizationRequest(
        "test-no-role",
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest,
        "User"
      );

      expect(result).toContain(
        "oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/test-no-role"
      );

      // Verify the saved request has default DCQL query
      const savedRequest =
        await service.getAuthorizationRequestFromDB("test-no-role");
      expect(savedRequest.dcqlQuery.credentials[0].claims).toEqual([
        { id: "email", path: ["credentialSubject", "email"] }
      ]);
    });

    it("should create an authorization request with role requirement", async () => {
      const result = await service.createAuthorizationRequest(
        "test-with-role",
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest,
        "Administrator"
      );

      expect(result).toContain(
        "oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/test-with-role"
      );

      // Verify the saved request has role-specific DCQL query
      const savedRequest =
        await service.getAuthorizationRequestFromDB("test-with-role");
      expect(savedRequest.dcqlQuery.credentials[0].claims).toEqual(
        expect.arrayContaining([
          { id: "email", path: ["credentialSubject", "email"] },
          {
            id: "role",
            path: ["credentialSubject", "role"],
            values: ["Administrator"]
          }
        ])
      );
    });
  });

  describe("getAuthorizationRequest", () => {
    it("should return the authorization request with DCQL query", async () => {
      const id = "test-get-request";
      const dcqlQuery = {
        credentials: [
          {
            id: "identity_credential",
            format: "dc+sd-jwt",
            meta: {
              type_values: [["VerifiableCredential", "HandsonCredential"]]
            },
            claims: [
              {
                path: ["credentialSubject", "email"]
              },
              {
                path: ["credentialSubject", "role"],
                values: ["Administrator"]
              }
            ]
          }
        ]
      };

      await service.authorizationRequestRepository.save({
        identifier: id,
        nonce: "test-nonce",
        dcqlQuery: dcqlQuery,
        response_mode: "direct_post",
        response_type: "vp_token",
        response_uri: "http://localhost/api/oid4vp/authorize"
      });

      const result = await service.getAuthorizationRequest(id);

      expect(result).toEqual(
        expect.objectContaining({
          state: id,
          nonce: "test-nonce",
          dcql_query: dcqlQuery,
          client_id: "http://localhost",
          response_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "direct_post"
        })
      );
    });

    it("should throw an error if the authorization request is not found", async () => {
      const id = "non-existent-id";
      await expect(service.getAuthorizationRequest(id)).rejects.toThrow(
        AppError
      );
    });
  });

  describe("getOrCreateAuthorizationRequestUrl", () => {
    it("should return existing authorization request URL if found", async () => {
      const identifier = "existing-request";
      await service.createAuthorizationRequest(
        identifier,
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest,
        "User"
      );

      const result = await service.getOrCreateAuthorizationRequestUrl(
        identifier,
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest
      );

      expect(result).toContain(
        `oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/${identifier}`
      );
    });

    it("should create new authorization request if not found", async () => {
      const identifier = "new-request-with-role";
      const result = await service.getOrCreateAuthorizationRequestUrl(
        identifier,
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest,
        "Administrator"
      );

      expect(result).toContain(
        `oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/${identifier}`
      );

      const savedRequest =
        await service.getAuthorizationRequestFromDB(identifier);
      expect(savedRequest.dcqlQuery.credentials[0].claims).toContainEqual({
        id: "role",
        path: ["credentialSubject", "role"],
        values: ["Administrator"]
      });
    });
  });

  describe("getAuthorizationRequestFromDB", () => {
    it("should return authorization request with user relation", async () => {
      const identifier = "test-db-request";
      await service.createAuthorizationRequest(
        identifier,
        {
          client_id: "http://localhost",
          redirect_uri: "http://localhost/api/oid4vp/authorize",
          response_type: "vp_token",
          response_mode: "query"
        } as AuthorizationRequest,
        "User"
      );

      const result = await service.getAuthorizationRequestFromDB(identifier);

      expect(result.identifier).toBe(identifier);
      expect(result.dcqlQuery).toBeDefined();
      expect(result.nonce).toBeDefined();
    });

    it("should throw AppError when request not found", async () => {
      await expect(
        service.getAuthorizationRequestFromDB("non-existent")
      ).rejects.toThrow(AppError);
    });
  });

  describe("credential extraction methods", () => {
    describe("extractFromCredential", () => {
      it("should extract email and role from single credential", () => {
        const credentialContainer = {
          credential: {
            credentialSubject: {
              email: "single@example.com",
              role: "Developer"
            }
          }
        } as unknown as CredentialContainer;

        const result = service["extractFromCredential"](credentialContainer);
        expect(result).toEqual({
          email: "single@example.com",
          isAdmin: false,
          role: "Developer"
        });
      });

      it("should identify Administrator role", () => {
        const credentialContainer = {
          credential: {
            credentialSubject: {
              email: "admin@example.com",
              role: "Administrator"
            }
          }
        } as unknown as CredentialContainer;

        const result = service["extractFromCredential"](credentialContainer);
        expect(result).toEqual({
          email: "admin@example.com",
          isAdmin: false, // isAdmin logic is now handled in extractCredentialData
          role: "Administrator"
        });
      });

      it("should handle array of credential subjects", () => {
        const credentialContainer = {
          credential: {
            credentialSubject: [
              { role: "Participant" },
              { email: "multi@example.com" }
            ]
          }
        } as unknown as CredentialContainer;

        const result = service["extractFromCredential"](credentialContainer);
        expect(result.email).toBe("multi@example.com");
        expect(result.role).toBe("Participant");
      });

      it("should return undefined for missing fields", () => {
        const credentialContainer = {
          credential: {
            credentialSubject: {
              name: "John Doe"
            }
          }
        } as unknown as CredentialContainer;

        const result = service["extractFromCredential"](credentialContainer);
        expect(result).toEqual({
          email: undefined,
          isAdmin: false,
          role: undefined
        });
      });

      it("should prioritize first email found", () => {
        const credentialContainer = {
          credential: {
            credentialSubject: [
              { email: "first@example.com", role: "User" },
              { email: "second@example.com" }
            ]
          }
        } as unknown as CredentialContainer;

        const result = service["extractFromCredential"](credentialContainer);
        expect(result.email).toBe("first@example.com");
      });
    });
  });
  describe("user management methods", () => {
    describe("getOrCreateUser", () => {
      it("should return existing user if found", async () => {
        // Create a user first
        const existingUser = await service["usersService"].createUser({
          username: "existing@example.com",
          email: "existing@example.com",
          password: "password",
          roles: ["sso_bridge_user"],
          grants: ["authorization_code"]
        });

        const result = await service["getOrCreateUser"](
          "existing@example.com",
          false
        );
        expect(result.email).toBe("existing@example.com");
        expect(result.id).toBe(existingUser.id);
      });

      it("should create new regular user if not found", async () => {
        const result = await service["getOrCreateUser"](
          "newuser@example.com",
          false
        );
        expect(result.email).toBe("newuser@example.com");
        expect(result.username).toBe("newuser@example.com");
      });

      it("should create new admin user if not found and isAdmin=true", async () => {
        const result = await service["getOrCreateUser"](
          "newadmin@example.com",
          true
        );
        expect(result.email).toBe("newadmin@example.com");
        expect(result.username).toBe("newadmin@example.com");
      });
    });

    describe("createNewUser", () => {
      it("should create user with correct email and username for base user", async () => {
        const result = await service["createNewUser"](
          "baseuser@example.com",
          false
        );
        expect(result.email).toBe("baseuser@example.com");
        expect(result.username).toBe("baseuser@example.com");
        expect(result.grants).toEqual(["authorization_code"]);
      });

      it("should create user with correct email and username for admin user", async () => {
        const result = await service["createNewUser"](
          "adminuser@example.com",
          true
        );
        expect(result.email).toBe("adminuser@example.com");
        expect(result.username).toBe("adminuser@example.com");
        expect(result.grants).toEqual(["authorization_code"]);
      });
    });
  });

  describe("DCQL query generation", () => {
    describe("getDefaultDcqlQuery", () => {
      it("should create default query without role", () => {
        // First test that the service has the config
        expect(service["config"]).toBeDefined();
        expect(service["config"].dcqlQueryMap).toBeDefined();
        expect(service["config"].dcqlQueryMap.User).toBeDefined();

        const result = service["getDefaultDcqlQuery"]();
        expect(result).toEqual({
          credentials: [
            {
              id: "identity_credential",
              format: "dc+sd-jwt",
              meta: {
                type_values: [["VerifiableCredential", "HandsonCredential"]]
              },
              claims: [
                {
                  id: "email",
                  path: ["credentialSubject", "email"]
                }
              ]
            }
          ]
        });
      });
    });
  });

  describe("handleVerifiablePresentations", () => {
    let mockAuthRequest: AuthorizationRequestDao;

    beforeEach(async () => {
      // Setup a mock authorization request
      mockAuthRequest = new AuthorizationRequestDao();
      mockAuthRequest.identifier = "test-handle-vp";
      mockAuthRequest.nonce = "test-nonce";
      mockAuthRequest.dcqlQuery = service["getDefaultDcqlQuery"]();
      mockAuthRequest.completed = false;
      await service.authorizationRequestRepository.save(mockAuthRequest);
    });

    it("should successfully process verifiable presentations and return user", async () => {
      // Mock verifiable presentations (using unknown then casting to avoid strict typing issues)
      const mockVerifiablePresentations = [
        {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [
            {
              "@context": ["https://www.w3.org/ns/credentials/v2"],
              type: ["VerifiableCredential"],
              credentialSubject: {
                email: "test@example.com",
                role: "User"
              }
            }
          ]
        }
      ] as unknown as VerifiablePresentation[];

      // Execute the test
      const result = await service["handleVerifiablePresentations"](
        mockVerifiablePresentations,
        mockAuthRequest
      );

      // Verify results
      expect(result).toBeDefined();
      expect(result.email).toBe("test@example.com");

      // Verify authorization request completion status was updated
      const updatedAuthRequest =
        await service.authorizationRequestRepository.findOne({
          where: { identifier: "test-handle-vp" }
        });
      expect(updatedAuthRequest?.completed).toBe(true);
    });

    it("should throw error when email is not found in presentations", async () => {
      const mockVerifiablePresentations =
        [] as unknown as VerifiablePresentation[];

      // Execute and expect error
      await expect(
        service["handleVerifiablePresentations"](
          mockVerifiablePresentations,
          mockAuthRequest
        )
      ).rejects.toThrow(
        new AppError("Could not find email in the verifiable presentation", 400)
      );
    });

    it("should throw error when required role is not present", async () => {
      const mockVerifiablePresentations = [
        {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [
            {
              "@context": ["https://www.w3.org/ns/credentials/v2"],
              type: ["VerifiableCredential"],
              credentialSubject: {
                email: "test@example.com",
                role: "User"
              }
            }
          ]
        }
      ] as unknown as VerifiablePresentation[];

      // Execute with required role "Administrator" - should fail
      await expect(
        service["handleVerifiablePresentations"](
          mockVerifiablePresentations,
          mockAuthRequest,
          "Administrator"
        )
      ).rejects.toThrow(
        new AppError(
          "Access denied: Required role 'Administrator' not found. User has role: 'User'",
          403
        )
      );
    });

    it("should succeed when user has the required role", async () => {
      const mockVerifiablePresentations = [
        {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [
            {
              "@context": ["https://www.w3.org/ns/credentials/v2"],
              type: ["VerifiableCredential"],
              credentialSubject: {
                email: "test@example.com",
                role: "Administrator"
              }
            }
          ]
        }
      ] as unknown as VerifiablePresentation[];

      // Execute with required role "Administrator" - should succeed
      const result = await service["handleVerifiablePresentations"](
        mockVerifiablePresentations,
        mockAuthRequest,
        "Administrator"
      );

      expect(result).toBeDefined();
      expect(result.email).toBe("test@example.com");
    });

    it("should handle role checking when no role is present in credential", async () => {
      const mockVerifiablePresentations = [
        {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [
            {
              "@context": ["https://www.w3.org/ns/credentials/v2"],
              type: ["VerifiableCredential"],
              credentialSubject: {
                email: "test@example.com"
              }
            }
          ]
        }
      ] as unknown as VerifiablePresentation[];

      // Execute with required role - should fail with "none" in error message
      await expect(
        service["handleVerifiablePresentations"](
          mockVerifiablePresentations,
          mockAuthRequest,
          "Administrator"
        )
      ).rejects.toThrow(
        new AppError(
          "Access denied: Required role 'Administrator' not found. User has role: 'none'",
          403
        )
      );
    });
  });

  describe("private getOid4vpUri", () => {
    it("should generate correct OID4VP URI", () => {
      const identifier = "test-identifier";
      const result = service["getOid4vpUri"](identifier);
      expect(result).toBe(
        `oid4vp://?client_id=http://localhost&request_uri=http://localhost/api/oid4vp/ar/${identifier}`
      );
    });
  });
});
