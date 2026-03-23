import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ServerConfig } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";
import { decodeJwt } from "jose";
import { vi } from "vitest";

import { OauthClient } from "../model/client.dao.js";
import { KeyDao } from "../model/keys.dao.js";
import { TokenDao } from "../model/token.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { TokenService } from "./token.service.js";

describe("TokenService", () => {
  let tokenService: TokenService;
  let mockKeyRepository: any;
  let mockTokenRepository: any;
  let mockServerConfig: ServerConfig;

  beforeEach(async () => {
    mockKeyRepository = {
      findOneBy: vi.fn(),
      save: vi.fn(),
      create: vi.fn().mockImplementation((x) => ({ id: randomUUID(), ...x })),
      find: vi.fn(),
      update: vi.fn()
    };

    mockTokenRepository = {
      save: vi.fn(),
      create: vi.fn().mockImplementation((x) => ({ id: randomUUID(), ...x })),
      findOneBy: vi.fn()
    };

    mockServerConfig = plainToInstance(ServerConfig, {
      publicAddress: "http://localhost:3000"
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: ServerConfig,
          useValue: mockServerConfig
        },
        {
          provide: getRepositoryToken(KeyDao),
          useValue: mockKeyRepository
        },
        {
          provide: getRepositoryToken(TokenDao),
          useValue: mockTokenRepository
        }
      ]
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
  });

  describe("createToken", () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      permissions: ["manage:sso.user", "manage:sso.client"]
    } as unknown as OauthUser;

    beforeEach(() => {
      mockTokenRepository.save = vi
        .fn()
        .mockImplementation((token) => Promise.resolve(token));
    });

    it("should create an access token", async () => {
      const tokenResponse = await tokenService.createToken(
        "test-client",
        mockUser,
        false
      );

      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.token_type).toBe("Bearer");
      expect(tokenResponse.expires_in).toBe(3600);
      expect(tokenResponse.id_token).toBeDefined();

      const decoded = decodeJwt(tokenResponse.access_token);
      expect(decoded.sub).toBe("1");
      expect(decoded.aud).toBe("test-client");
      expect(decoded.username).toBe("testuser");
      expect(decoded.email).toBe("test@example.com");
    });

    it("should create both access and refresh tokens when requested", async () => {
      const tokenResponse = await tokenService.createToken(
        "test-client",
        mockUser,
        true
      );

      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.refresh_token).toBeDefined();

      const accessDecoded = decodeJwt(tokenResponse.access_token);
      const refreshDecoded = decodeJwt(tokenResponse.refresh_token!);

      expect(accessDecoded.tokenType).toBe("access_token");
      expect(refreshDecoded.tokenType).toBe("refresh_token");
    });

    it("should include nonce in token when provided", async () => {
      const nonce = "test-nonce-123";
      const tokenResponse = await tokenService.createToken(
        "test-client",
        mockUser,
        false,
        undefined,
        undefined,
        nonce
      );

      const decoded = decodeJwt(tokenResponse.access_token);
      expect(decoded.nonce).toBe(nonce);
    });

    it("should include user permissions in token", async () => {
      const tokenResponse = await tokenService.createToken(
        "test-client",
        mockUser,
        false
      );

      const decoded = decodeJwt(tokenResponse.access_token);
      expect(decoded.permissions).toBeDefined();
      expect(Array.isArray(decoded.permissions)).toBe(true);
      expect(
        (decoded.permissions as string[]).includes("manage:sso.user")
      ).toBe(true);
    });

    it("should include azp in client tokens", async () => {
      const mockClient = {
        clientId: "test-client",
        permissions: ["manage:sso.client"]
      } as unknown as OauthClient;

      const tokenResponse = await tokenService.createToken(
        "test-client",
        mockClient,
        false
      );

      const decoded = decodeJwt(tokenResponse.access_token);
      expect(decoded.sub).toBe("test-client");
      expect(decoded.azp).toBe("test-client");
      expect(decoded.username).toBeUndefined();
      expect(decoded.email).toBeUndefined();
    });
  });

  describe("validateToken", () => {
    it("should validate a valid access token", async () => {
      const mockStoredToken = {
        id: 1,
        accessToken: "valid-token",
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        clientId: "test-client",
        revoked: false
      } as unknown as TokenDao;

      mockTokenRepository.findOneBy?.mockResolvedValue(mockStoredToken);

      const storedToken = await tokenService.validateToken(
        "valid-token",
        "access_token"
      );

      expect(storedToken).toBeDefined();
      expect(storedToken.accessToken).toBe("valid-token");
    });

    it("should throw error for invalid token", async () => {
      mockTokenRepository.findOneBy?.mockResolvedValue(null);

      await expect(
        tokenService.validateToken("invalid-token", "access_token")
      ).rejects.toThrow("Invalid token");
    });

    it("should throw error for revoked token", async () => {
      const mockStoredToken = {
        id: 1,
        accessToken: "revoked-token",
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        revoked: true
      } as unknown as TokenDao;

      mockTokenRepository.findOneBy?.mockResolvedValue(mockStoredToken);

      await expect(
        tokenService.validateToken("revoked-token", "access_token")
      ).rejects.toThrow("Token revoked");
    });

    it("should throw error for expired token", async () => {
      const mockStoredToken = {
        id: 1,
        accessToken: "expired-token",
        accessTokenExpiresAt: new Date(Date.now() - 1000),
        revoked: false
      } as unknown as TokenDao;

      mockTokenRepository.findOneBy?.mockResolvedValue(mockStoredToken);

      await expect(
        tokenService.validateToken("expired-token", "access_token")
      ).rejects.toThrow("Token expired");
    });
  });

  describe("revokeToken", () => {
    it("should revoke a token", async () => {
      const mockStoredToken = {
        id: 1,
        accessToken: "token-to-revoke",
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        revoked: false
      } as unknown as TokenDao;

      mockTokenRepository.findOneBy?.mockResolvedValue(mockStoredToken);
      mockTokenRepository.save?.mockResolvedValue(mockStoredToken);

      await tokenService.revokeToken("token-to-revoke");

      expect(mockTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true })
      );
    });
  });

  describe("keySet", () => {
    it("should return public keys", async () => {
      const mockKeys = [
        {
          kid: "key-1",
          publicKey: { kid: "key-1", kty: "RSA" }
        }
      ] as KeyDao[];

      mockKeyRepository.find?.mockResolvedValue(mockKeys);

      const keys = await tokenService.keySet();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(1);
      expect(keys[0]).toHaveProperty("kid");
      expect(keys[0]).toHaveProperty("kty");
    });
  });
});
