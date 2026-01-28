import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthorizationRequest,
  ClientCredentialsTokenRequest,
  CodeTokenRequest,
  RefreshTokenRequest,
  ServerConfig,
  TokenRequest,
  TokenResponse,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
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
import { OauthService } from "./oauth.service.js";
import { TokenService } from "./token.service.js";

describe("Oauth", () => {
  let oauth: OauthService;
  let rolesService: RolesService;
  let userRole: OauthRole;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(ServerConfig, {});
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
        OauthService,
        UsersService,
        RolesService,
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
        ClientsService,
        TokenService,
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

    oauth = module.get<OauthService>(OauthService);

    rolesService = module.get<RolesService>(RolesService);
    userRole = await rolesService.createRole({
      name: "user",
      description: "User role"
    });

    await module.get(UsersService).createUser({
      username: "Alice",
      password: "password",
      email: "alice@example.com",
      roles: [userRole.name],
      grants: ["authorization_code"]
    });
    await module.get(ClientsService).createClient({
      clientId: "test-client",
      clientSecret: "test-secret",
      secretName: "test-secret",
      roles: [userRole.name],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Test Client",
      description: "A test client",
      redirectUris: ["http://localhost:3000", "http://.*.localhost:3000"]
    });
  });

  it("Metadata", async () => {
    const metadata = oauth.openIDConfiguration();
    expect(metadata).toBeDefined();
    expect(metadata.issuer).toEqual("http://localhost:3000");

    await expect(oauth.deviceAuthorization()).rejects.toThrow(
      "Not implemented"
    );

    const jwks = await oauth.jwks();
    expect(jwks).toBeDefined();
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length).toBeGreaterThan(0);
  });
  it("Authorize", async () => {
    const authorizationRequest: AuthorizationRequest = {
      response_type: "code",
      client_id: "test-client",
      redirect_uri: "http://test.localhost:3000",
      scope: "openid",
      state: "1234"
    };
    const response = await oauth.authorize(authorizationRequest);
    expect(response).toBeDefined();
    expect(response.url).toContain("test-client");
    expect(response.url).toContain("http://localhost:3000");
    expect(response.url).toContain("openid");
    expect(response.url).toContain("1234");
  });
  describe("Login", () => {
    it("Response modes", async () => {
      const loginRedirect = await oauth.login("Alice", "password", {
        response_type: "code",
        response_mode: "query",
        client_id: "test-client",
        code_challenge: "randomChallenge",
        redirect_uri: "http://localhost:3000",
        state: "1234"
      });
      const redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      expect(redirectUrl.searchParams.get("code")).toBeDefined();
      const loginRedirect2 = await oauth.login("Alice", "password", {
        response_type: "code",
        response_mode: "fragment",
        client_id: "test-client",
        code_challenge: "randomChallenge",
        redirect_uri: "http://localhost:3000",
        state: "1234"
      });
      const redirectUrl2 = new URL(loginRedirect2.url);
      expect(redirectUrl2.pathname).toEqual("/");
      expect(redirectUrl2.hash).toEqual(expect.stringContaining("state=1234"));
      expect(redirectUrl2.hash).toEqual(expect.stringContaining("code="));
    });
    it("Response types", async () => {
      let loginRedirect: { url: string };
      let redirectUrl: URL;
      loginRedirect = await oauth.login("Alice", "password", {
        response_type: "code",
        response_mode: "query",
        code_challenge: "randomChallenge",
        client_id: "test-client",
        redirect_uri: "http://localhost:3000",
        state: "1234"
      });
      redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      expect(redirectUrl.searchParams.get("code")).toBeDefined();

      loginRedirect = await oauth.login("Alice", "password", {
        response_type: "token",
        response_mode: "query",
        client_id: "test-client",

        redirect_uri: "http://localhost:3000",
        state: "1234"
      });
      redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      expect(redirectUrl.searchParams.get("token")).toBeDefined();
      expect(redirectUrl.searchParams.get("expires_in")).toEqual("3600");
      expect(redirectUrl.searchParams.get("token_type")).toEqual("Bearer");

      loginRedirect = await oauth.login("Alice", "password", {
        response_type: "id_token",
        response_mode: "query",
        client_id: "test-client",
        redirect_uri: "http://localhost:3000",
        state: "1234",
        nonce: "5678"
      });
      redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      expect(redirectUrl.searchParams.get("id_token")).toBeDefined();
      const claims = decodeJwt(redirectUrl.searchParams.get("id_token")!);
      expect(claims.nonce).toEqual("5678");
    });
    it("PKCE", async () => {
      let loginRedirect: { url: string };
      let redirectUrl: URL;
      loginRedirect = await oauth.login("Alice", "password", {
        response_type: "code",
        response_mode: "query",
        client_id: "test-client",
        redirect_uri: "http://localhost:3000",
        state: "1234",
        code_challenge: "randomChallenge",
        code_challenge_method: "plain"
      });
      redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      expect(redirectUrl.searchParams.get("code")).toBeDefined();
      loginRedirect = await oauth.login("Alice", "password", {
        response_type: "code",
        response_mode: "query",
        client_id: "test-client",
        redirect_uri: "http://localhost:3000",
        state: "1234",
        code_challenge: "randomChallenge",
        code_challenge_method: "S256"
      });
      redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      expect(redirectUrl.searchParams.get("code")).toBeDefined();
    });
    it("Login handler", async () => {
      const request = {
        session: {}
      } as unknown as Request;
      const response = {
        redirect: vi.fn(),
        status: vi.fn(),
        json: vi.fn()
      } as unknown as Response;
      const authorizationRequest: AuthorizationRequest = {
        response_type: "code",
        response_mode: "query",
        client_id: "test-client",
        code_challenge: "randomChallenge",
        redirect_uri: "http://localhost:3000",
        state: "1234"
      };
      await oauth.loginHandler(
        request,
        response,
        authorizationRequest,
        false,
        "Alice",
        "password",
        undefined
      );
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.redirect).not.toHaveBeenCalled();
      vi.clearAllMocks();
      await oauth.loginHandler(
        request,
        response,
        authorizationRequest,
        true,
        undefined,
        undefined,
        {
          id: 1,
          username: "Alice",
          email: "alice@example.com",
          roles: [userRole],
          grants: ["authorization_code"]
        } as OauthUser
      );
      expect(response.redirect).toHaveBeenCalled();
      expect(response.status).not.toHaveBeenCalled();
      vi.clearAllMocks();
      await expect(
        oauth.loginHandler(
          request,
          response,
          authorizationRequest,
          false,
          undefined,
          undefined,
          undefined
        )
      ).rejects.toThrow("Invalid login request");
      expect(response.redirect).not.toHaveBeenCalled();
      expect(response.status).not.toHaveBeenCalled();
      vi.clearAllMocks();
      const invalidAuthorizationRequest: AuthorizationRequest = {
        response_type: "code",
        response_mode: "query",
        code_challenge: "randomChallenge",
        client_id: "test-client",
        redirect_uri: "http://test.localhost:3001",
        state: "1234"
      };
      await expect(
        oauth.loginHandler(
          request,
          response,
          invalidAuthorizationRequest,
          true,
          undefined,
          undefined,
          {
            id: 1,
            username: "Alice",
            email: "alice@example.com",
            roles: [userRole],
            grants: ["authorization_code"]
          } as OauthUser
        )
      ).rejects.toThrow("Invalid redirect uri");
      expect(response.redirect).not.toHaveBeenCalled();
      expect(response.status).not.toHaveBeenCalled();
    });
  });
  describe("Authorization code flow", () => {
    let code: string;
    let token: TokenResponse;
    it("Request code", async () => {
      const loginRedirect = await oauth.login("Alice", "password", {
        response_type: "code",
        client_id: "test-client",
        code_challenge: "randomChallenge",
        redirect_uri: "http://localhost:3000",
        state: "1234"
      });
      const redirectUrl = new URL(loginRedirect.url);
      expect(redirectUrl.pathname).toEqual("/");
      expect(redirectUrl.searchParams.get("state")).toEqual("1234");
      code = redirectUrl.searchParams.get("code")!;
    });
    it("Request token", async () => {
      const tokenRequest = plainToInstance(CodeTokenRequest, {
        grant_type: "code",
        code: code,
        client_id: "test-client",
        redirect_uri: "http://localhost:3000"
      });
      token = await oauth.token(tokenRequest);
      expect(token).toBeDefined();
      const introspection = await oauth.introspect(token.access_token);
      expect(introspection.active).toBeTruthy();
      const userinfo = await oauth.userinfo(token.access_token);
      expect(userinfo.username).toEqual("Alice");
    });
    it("Refresh token", async () => {
      const refreshRequest = plainToInstance(RefreshTokenRequest, {
        grant_type: "refresh_token",
        refresh_token: token.refresh_token
      });
      const refresh = await oauth.token(refreshRequest);
      expect(refresh).toBeDefined();
      const introspectionRefresh = await oauth.introspect(refresh.access_token);
      expect(introspectionRefresh.active).toBeTruthy();
      const introspectionOldAccessToken = await oauth.introspect(
        token.access_token
      );
      expect(introspectionOldAccessToken.active).toBeFalsy();
      token = refresh;
    });
    it("Refresh token errors", async () => {
      const refreshRequest = plainToInstance(RefreshTokenRequest, {
        grant_type: "refresh_token",
        refresh_token: "unknown"
      });
      await expect(oauth.token(refreshRequest)).rejects.toThrow(
        "Invalid token"
      );
      await oauth["tokenService"]["tokenRepository"].update(
        { refreshToken: token.refresh_token },
        { userId: null as unknown as number }
      );
      const misconfiguredRefreshRequest = plainToInstance(RefreshTokenRequest, {
        grant_type: "refresh_token",
        refresh_token: token.refresh_token
      });
      await expect(oauth.token(misconfiguredRefreshRequest)).rejects.toThrow(
        "Invalid token"
      );
      await oauth["tokenService"]["tokenRepository"].update(
        { refreshToken: token.refresh_token },
        { refreshTokenExpiresAt: Math.floor(Date.now() / 1000) - 60 }
      );
      const expiredRefreshRequest = plainToInstance(RefreshTokenRequest, {
        grant_type: "refresh_token",
        refresh_token: token.refresh_token
      });
      await expect(oauth.token(expiredRefreshRequest)).rejects.toThrow(
        "Token expired"
      );
    });
    it("Revoke token", async () => {
      await oauth.revocation(token.access_token);
      const introspectionRevoked = await oauth.introspect(token.access_token);
      expect(introspectionRevoked.active).toBeFalsy();
    });
    it("Request token with invalid code", async () => {
      const tokenRequest: CodeTokenRequest = plainToInstance(CodeTokenRequest, {
        grant_type: "code",
        code: "000000",
        client_id: "test-client",
        redirect_uri: "http://localhost:3000"
      });
      await expect(oauth.token(tokenRequest)).rejects.toThrow("Invalid code");
    });
  });
  it("Client credentials flow", async () => {
    const tokenRequest = plainToInstance(ClientCredentialsTokenRequest, {
      grant_type: "client_credentials",
      client_id: "test-client",
      client_secret: "test-secret"
    });
    const token = await oauth.token(tokenRequest);
    expect(token).toBeDefined();
    const introspection = await oauth.introspect(token.access_token);
    expect(introspection.active).toBeTruthy();

    await oauth.revocation(token.access_token);
    const introspectionRevoked = await oauth.introspect(token.access_token);
    expect(introspectionRevoked.active).toBeFalsy();
  });
  it("Client credentials with missing authentication should fail", async () => {
    const tokenRequest = plainToInstance(ClientCredentialsTokenRequest, {
      grant_type: "client_credentials",
      client_id: "test-client"
      // No client_secret or client_assertion provided
    });
    await expect(oauth.token(tokenRequest)).rejects.toThrow(
      "Either client_secret or client_assertion must be provided"
    );
  });
  it("Local token verification", async () => {
    const tokenRequest = plainToInstance(ClientCredentialsTokenRequest, {
      grant_type: "client_credentials",
      client_id: "test-client",
      client_secret: "test-secret"
    });
    const token1 = await oauth.token(tokenRequest);
    await oauth["tokenService"]["rotateKey"]();
    const token2 = await oauth.token(tokenRequest);

    const jwks = await oauth.jwks();

    const jwtHeader1 = decodeProtectedHeader(token1.access_token);
    const jwtHeader2 = decodeProtectedHeader(token2.access_token);

    expect(jwtHeader1.kid).not.toEqual(jwtHeader2.kid);

    const jwk1 = jwks.keys.find((k) => k.kid === jwtHeader1.kid);
    const jwk2 = jwks.keys.find((k) => k.kid === jwtHeader2.kid);
    expect(jwk1).toBeDefined();
    expect(jwk2).toBeDefined();

    await jwtVerify(token1.access_token, jwk1!);
    await jwtVerify(token2.access_token, jwk2!);
  });
  it("Unsupported grant type", async () => {
    const tokenRequest = {
      grant_type: "unsupported",
      client_id: "test-client"
    } as unknown as TokenRequest;
    await expect(oauth.token(tokenRequest)).rejects.toThrow(
      "Invalid grant type"
    );
  });
});
