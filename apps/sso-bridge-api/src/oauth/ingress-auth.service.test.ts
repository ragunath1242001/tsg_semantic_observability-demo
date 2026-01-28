import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServerConfig, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { Request } from "express";
import { vi } from "vitest";

import { RecoveryCodeService } from "../auth/recovery-code.service.js";
import { TotpService } from "../auth/totp.service.js";
import { TwoFactorHelper } from "../auth/two-factor.helper.js";
import { WebAuthnService } from "../auth/webauthn.service.js";
import { ClientsService } from "../clients/clients.service.js";
import { RootConfig } from "../config.js";
import { KubernetesService } from "../k8s/kubernetes.service.js";
import { OauthClient } from "../model/client.dao.js";
import { KeyDao } from "../model/keys.dao.js";
import { RecoveryCode } from "../model/recovery-code.dao.js";
import { OauthRole } from "../model/role.dao.js";
import { TokenDao } from "../model/token.dao.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { RolesService } from "../roles/roles.service.js";
import { UsersService } from "../users/users.service.js";
import { IngressAuthService } from "./ingress-auth.service.js";
import { OauthService } from "./oauth.service.js";
import { TokenService } from "./token.service.js";

describe("IngressAuthService", () => {
  let ingressAuthService: IngressAuthService;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(ServerConfig, {
      publicAddress: "http://localhost:3000"
    });
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          OauthUser,
          OauthClient,
          OauthRole,
          TokenDao,
          KeyDao,
          TotpCredential,
          WebAuthnCredential,
          RecoveryCode
        ]),
        TypeOrmModule.forFeature([
          OauthUser,
          OauthClient,
          OauthRole,
          TokenDao,
          KeyDao,
          TotpCredential,
          WebAuthnCredential,
          RecoveryCode
        ])
      ],
      providers: [
        IngressAuthService,
        {
          provide: OauthService,
          useValue: {
            jwks: () => ({
              keys: [{ kid: "test-kid", kty: "oct", k: "test-key" }]
            })
          }
        },
        ClientsService,
        UsersService,
        {
          provide: KubernetesService,
          useValue: {
            applySecret: vi.fn()
          }
        },
        TokenService,
        RolesService,
        TotpService,
        WebAuthnService,
        RecoveryCodeService,
        TwoFactorHelper,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        },
        {
          provide: ServerConfig,
          useValue: config
        }
      ]
    }).compile();

    ingressAuthService = module.get<IngressAuthService>(IngressAuthService);
  });
  describe("Test Ingress Auth handling", () => {
    it("No session", async () => {
      const request = {
        session: {}
      } as unknown as Request;
      const isAuthenticated = await ingressAuthService.isAuthenticated(request);
      expect(isAuthenticated).toBe(false);
    });
    it("Session with user", async () => {
      const request = {
        session: {
          user: { id: "test-user" }
        }
      } as unknown as Request;
      const isAuthenticated = await ingressAuthService.isAuthenticated(request);
      expect(isAuthenticated).toBe(true);
    });
    describe("handleSignin", () => {
      it("should throw an error if clientId is not provided", async () => {
        await expect(
          ingressAuthService.handleSignin(undefined, "/redirect")
        ).rejects.toThrow("No client ID provided");
      });

      it("should generate a valid authorize URL and store redirect state", async () => {
        // Mock config
        const clientId = "test-client";
        const rd = "/some-redirect";

        const result = await ingressAuthService.handleSignin(clientId, rd);

        expect(result).toHaveProperty("url");
        const url = new URL(result.url);
        expect(url.pathname).toBe("/api/oauth/authorize");
        expect(url.searchParams.get("client_id")).toBe(clientId);
        expect(url.searchParams.get("redirect_uri")).toBe(
          "http://localhost:3000/api/ingress-auth/callback"
        );
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("response_mode")).toBe("query");
        expect(url.searchParams.get("state")).toBeDefined();
        expect(url.searchParams.get("code_challenge")).toBeDefined();
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");

        // Check that the state is stored in redirects map
        const state = url.searchParams.get("state")!;
        const redirect = IngressAuthService["redirects"].get(state);
        expect(redirect).toBeDefined();
        expect(redirect?.client_id).toBe(clientId);
        expect(redirect?.redirect_uri).toBe(rd);
        expect(typeof redirect?.code_verifier).toBe("string");
        expect(redirect?.validUntil).toBeGreaterThan(Date.now());
      });

      it("should use default redirect_uri if not provided", async () => {
        const clientId = "test-client";
        const result = await ingressAuthService.handleSignin(clientId);

        const url = new URL(result.url);
        const state = url.searchParams.get("state")!;
        const redirect = IngressAuthService["redirects"].get(state);
        expect(redirect?.redirect_uri).toBe("/");
      });
    });
    describe("logout", () => {
      it("should set session.user to undefined if session exists", async () => {
        const req = {
          session: {
            user: { id: "test-user" }
          }
        } as unknown as Request & {
          session: { user: { id: string } | undefined };
        };

        await ingressAuthService.logout(req);

        expect(req.session).toEqual({ user: undefined });
      });

      it("should not throw if session does not exist", async () => {
        const req = {} as unknown as Request;

        await expect(ingressAuthService.logout(req)).resolves.toBeUndefined();
      });
    });
    describe("IngressAuthService callback", () => {
      it("should throw if state is missing", async () => {
        await expect(
          ingressAuthService.callback({ code: "abc" } as any, {} as Request)
        ).rejects.toThrow("No state parameter");
      });

      it("should throw if state is invalid", async () => {
        await expect(
          ingressAuthService.callback(
            { code: "abc", state: "invalid" },
            {} as Request
          )
        ).rejects.toThrow("Invalid state parameter");
      });

      it("should throw if state is expired", async () => {
        const state = "expired-state";
        IngressAuthService["redirects"].set(state, {
          client_id: "cid",
          code_verifier: "ver",
          redirect_uri: "/",
          validUntil: Date.now() - 1000
        });
        await expect(
          ingressAuthService.callback({ code: "abc", state }, {} as Request)
        ).rejects.toThrow("State parameter expired");
      });
    });
  });
});
