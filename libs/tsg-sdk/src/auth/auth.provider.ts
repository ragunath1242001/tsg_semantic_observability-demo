import { importJWK, SignJWT } from "jose";

import type { TsgSdkAuthConfig } from "../config/sdk.config.js";
import { SdkError, SdkErrorCode } from "../utils/errors.js";
import type { OpenIDConfiguration, TokenResponse } from "./auth.types.js";

/**
 * Buffer (in milliseconds) subtracted from the token expiry time to ensure
 * tokens are refreshed before they actually expire.
 * @internal
 */
const TOKEN_EXPIRY_BUFFER_MS = 10_000;

/**
 * Handles OAuth 2.0 token acquisition, caching, and automatic refresh
 * for all SDK HTTP clients.
 *
 * Supports three authentication strategies:
 * - `client_secret_post` — client credentials with a shared secret.
 * - `private_key_jwt` — client credentials with a signed JWT assertion.
 * - `access_token` — static pre-obtained bearer token (no refresh).
 *
 * Tokens are cached and automatically re-acquired when they expire
 * (with a 10-second safety buffer). OpenID Connect discovery is used
 * to locate the token endpoint.
 */
export class AuthProvider {
  private cachedToken?: string;
  private tokenExpiresAt = 0;
  private openIdConfig?: OpenIDConfiguration;

  constructor(
    private readonly authConfig: TsgSdkAuthConfig | undefined,
    private readonly ssoBridgeBaseUrl: string | undefined
  ) {}

  /**
   * Get a valid access token, acquiring or refreshing one if necessary.
   *
   * - Returns `undefined` when no auth config is set (unauthenticated mode).
   * - Returns the static token for `access_token` auth.
   * - For other methods, returns a cached token or acquires a new one.
   * @returns The access token string, or `undefined` if auth is not configured.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.AUTH_FAILED} if token acquisition fails.
   */
  async getAccessToken(): Promise<string | undefined> {
    if (!this.authConfig) {
      return undefined;
    }

    if (this.authConfig.method === "access_token") {
      return this.authConfig.accessToken;
    }

    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const token = await this.acquireToken();
    return token;
  }

  /**
   * Build an HTTP headers object containing the `Authorization` header.
   *
   * Returns an empty object when auth is not configured, allowing
   * unauthenticated requests to pass through.
   * @returns A headers record, e.g. `{ Authorization: "Bearer <token>" }`.
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    if (!token) {
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  private async acquireToken(): Promise<string> {
    const config = this.authConfig;
    if (!config || config.method === "access_token") {
      throw new SdkError(
        "Cannot acquire token with access_token method",
        SdkErrorCode.AUTH_FAILED
      );
    }

    const openIdConfig = await this.getOpenIdConfiguration();
    const tokenEndpoint = openIdConfig.token_endpoint;

    const params = new URLSearchParams();
    params.set("grant_type", "client_credentials");
    params.set("client_id", config.clientId);

    if (config.method === "client_secret_post") {
      params.set("client_secret", config.clientSecret);
    } else if (config.method === "private_key_jwt") {
      const assertion = await this.createClientAssertion(
        config.clientId,
        config.privateKeyJwk,
        tokenEndpoint
      );
      params.set(
        "client_assertion_type",
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      );
      params.set("client_assertion", assertion);
    }

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SdkError(
        `Token acquisition failed (${response.status}): ${body}`,
        SdkErrorCode.AUTH_FAILED,
        response.status
      );
    }

    const tokenResponse: TokenResponse = await response.json();
    this.cachedToken = tokenResponse.access_token;

    if (tokenResponse.expires_in) {
      this.tokenExpiresAt =
        Date.now() + tokenResponse.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    } else {
      // Default to 5 minutes if no expiry given
      this.tokenExpiresAt = Date.now() + 5 * 60 * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    }

    return this.cachedToken;
  }

  private async getOpenIdConfiguration(): Promise<OpenIDConfiguration> {
    if (this.openIdConfig) {
      return this.openIdConfig;
    }

    const config = this.authConfig;
    if (!config || config.method === "access_token") {
      throw new SdkError(
        "No OpenID configuration available",
        SdkErrorCode.AUTH_FAILED
      );
    }

    const url =
      config.openIdConfigurationUrl ??
      (this.ssoBridgeBaseUrl
        ? `${new URL(this.ssoBridgeBaseUrl).origin}/.well-known/openid-configuration`
        : undefined);

    if (!url) {
      throw new SdkError(
        "Cannot determine OpenID configuration URL. Provide openIdConfigurationUrl or ssoBridgeBaseUrl.",
        SdkErrorCode.INVALID_CONFIG
      );
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new SdkError(
        `Failed to fetch OpenID configuration from ${url} (${response.status})`,
        SdkErrorCode.AUTH_FAILED,
        response.status
      );
    }

    this.openIdConfig = await response.json();
    return this.openIdConfig!;
  }

  private async createClientAssertion(
    clientId: string,
    privateKeyJwk: JsonWebKey,
    audience: string
  ): Promise<string> {
    const key = await importJWK(privateKeyJwk);
    const alg = this.resolveAlgorithm(privateKeyJwk);

    return new SignJWT({})
      .setProtectedHeader({ alg, typ: "JWT" })
      .setIssuer(clientId)
      .setSubject(clientId)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .setJti(crypto.randomUUID())
      .sign(key);
  }

  private resolveAlgorithm(jwk: JsonWebKey): string {
    if (jwk.alg) return jwk.alg;
    switch (jwk.kty) {
      case "EC":
        return jwk.crv === "P-384" ? "ES384" : "ES256";
      case "OKP":
        return "EdDSA";
      case "RSA":
        return "RS256";
      default:
        return "ES256";
    }
  }
}
