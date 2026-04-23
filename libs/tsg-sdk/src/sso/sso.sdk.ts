import { AuthProvider } from "../auth/auth.provider.js";
import type { OpenIDConfiguration, TokenResponse } from "../auth/auth.types.js";
import type { SsoBridgeClient } from "../client.js";
import type { TsgSdkAuthConfig } from "../config/sdk.config.js";
import { SdkError, SdkErrorCode } from "../utils/errors.js";
import { SsoManagementSdk } from "./sso-management.sdk.js";

/**
 * OpenID Connect integration, token management, and user/client administration
 * via the TSG SSO Bridge.
 *
 * Requires `ssoBridgeBaseUrl` to be set in the SDK configuration.
 *
 * This module provides:
 * - Access token acquisition and refresh using OIDC flows.
 * - Authorization code exchange (with optional PKCE).
 * - OpenID discovery and JWKS retrieval.
 * - User and OAuth client management via the {@link SsoManagementSdk | management} sub-module.
 * @example
 * ```ts
 * const token = await sdk.sso.getAccessToken();
 * const users = await sdk.sso.management.getUsers();
 * ```
 */
export class SsoSdk {
  private readonly authProvider: AuthProvider;
  /** User and OAuth client management operations. */
  readonly management: SsoManagementSdk;

  constructor(
    private readonly ssoBridgeBaseUrl: string,
    authConfig?: TsgSdkAuthConfig,
    ssoBridgeClient?: SsoBridgeClient
  ) {
    this.authProvider = new AuthProvider(authConfig, ssoBridgeBaseUrl);
    if (ssoBridgeClient) {
      this.management = new SsoManagementSdk(ssoBridgeClient);
    } else {
      this.management = new Proxy({} as SsoManagementSdk, {
        get(_target, prop) {
          if (typeof prop === "symbol") return undefined;
          return () => {
            throw new SdkError(
              "SSO management client not available. This should not happen when ssoBridgeBaseUrl is configured.",
              SdkErrorCode.NOT_CONFIGURED
            );
          };
        }
      });
    }
  }

  /**
   * Get an access token from the SSO bridge using the configured authentication method.
   * @returns The access token string.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.AUTH_FAILED} if no auth configuration is provided or token acquisition fails.
   */
  async getAccessToken(): Promise<string> {
    const token = await this.authProvider.getAccessToken();
    if (!token) {
      throw new SdkError(
        "No auth configuration provided",
        SdkErrorCode.AUTH_FAILED
      );
    }
    return token;
  }

  /**
   * Fetch the OpenID Connect discovery document from the SSO bridge.
   *
   * The `.well-known/openid-configuration` endpoint is always resolved at
   * the server origin, regardless of any path prefix in `ssoBridgeBaseUrl`.
   * @returns The parsed {@link OpenIDConfiguration}.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.REQUEST_FAILED} if the discovery request fails.
   */
  async getOpenIdConfiguration(): Promise<OpenIDConfiguration> {
    // .well-known is always at the server root, not under any API prefix
    const origin = new URL(this.ssoBridgeBaseUrl).origin;
    const url = `${origin}/.well-known/openid-configuration`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new SdkError(
        `Failed to fetch OpenID configuration (${response.status})`,
        SdkErrorCode.REQUEST_FAILED,
        response.status
      );
    }
    return response.json();
  }

  /**
   * Fetch the JSON Web Key Set (JWKS) from the SSO bridge.
   *
   * The JWKS URI is discovered automatically via the OpenID configuration.
   * These keys can be used to verify tokens issued by the SSO bridge.
   * @returns An object containing an array of {@link JsonWebKey} entries.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.REQUEST_FAILED} if the JWKS fetch fails.
   */
  async getJwks(): Promise<{ keys: JsonWebKey[] }> {
    const config = await this.getOpenIdConfiguration();
    const response = await fetch(config.jwks_uri);
    if (!response.ok) {
      throw new SdkError(
        `Failed to fetch JWKS (${response.status})`,
        SdkErrorCode.REQUEST_FAILED,
        response.status
      );
    }
    return response.json();
  }

  /**
   * Exchange an OAuth 2.0 authorization code for access and refresh tokens.
   *
   * Supports PKCE by accepting an optional `codeVerifier`.
   * @param code - The authorization code received from the authorization endpoint.
   * @param redirectUri - The redirect URI that was used in the original authorization request.
   * @param clientId - The OAuth client ID.
   * @param codeVerifier - Optional PKCE code verifier for public clients.
   * @returns A {@link TokenResponse} containing the access token and optional refresh token.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.AUTH_FAILED} if the exchange fails.
   */
  async exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
    clientId: string,
    codeVerifier?: string
  ): Promise<TokenResponse> {
    const config = await this.getOpenIdConfiguration();
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", redirectUri);
    params.set("client_id", clientId);
    if (codeVerifier) {
      params.set("code_verifier", codeVerifier);
    }

    const response = await fetch(config.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SdkError(
        `Authorization code exchange failed (${response.status}): ${body}`,
        SdkErrorCode.AUTH_FAILED,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Refresh an access token using an OAuth 2.0 refresh token.
   * @param refreshToken - The refresh token.
   * @param clientId - The OAuth client ID.
   * @returns A {@link TokenResponse} containing the new access token.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.AUTH_FAILED} if the refresh fails.
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string
  ): Promise<TokenResponse> {
    const config = await this.getOpenIdConfiguration();
    const params = new URLSearchParams();
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", refreshToken);
    params.set("client_id", clientId);

    const response = await fetch(config.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SdkError(
        `Token refresh failed (${response.status}): ${body}`,
        SdkErrorCode.AUTH_FAILED,
        response.status
      );
    }

    return response.json();
  }
}
