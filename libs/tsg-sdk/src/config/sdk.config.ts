/**
 * Configuration for creating a {@link TsgSdk} instance.
 *
 * Only `controlPlaneBaseUrl` is required. Provide `walletBaseUrl` and/or
 * `ssoBridgeBaseUrl` to enable the corresponding SDK modules.
 * @example
 * ```ts
 * const config: TsgSdkConfig = {
 *   controlPlaneBaseUrl: "http://localhost:3501",
 *   walletBaseUrl: "http://localhost:3500",
 *   ssoBridgeBaseUrl: "http://localhost:3700",
 *   auth: {
 *     method: "client_secret_post",
 *     clientId: "my-client",
 *     clientSecret: "my-secret",
 *   },
 * };
 * ```
 */
export interface TsgSdkConfig {
  /** Base URL of the control plane (e.g. "http://localhost:3501" or "http://localhost:3501/api" when the /api prefix is enabled) */
  controlPlaneBaseUrl: string;

  /** Base URL of the wallet (e.g. "http://localhost:3500" or "http://localhost:3500/api"). Optional - wallet features disabled if not provided. */
  walletBaseUrl?: string;

  /** Base URL of the SSO bridge (e.g. "http://localhost:3700" or "http://localhost:3700/api"). Required for auth. OpenID discovery always uses the server origin regardless of path. */
  ssoBridgeBaseUrl?: string;

  /** Authentication configuration. If omitted, requests are sent without auth. */
  auth?: TsgSdkAuthConfig;
}

/**
 * Authentication configuration for the SDK.
 *
 * Exactly one of the following strategies must be chosen:
 * - {@link ClientSecretAuthConfig} — OAuth 2.0 client credentials with a client secret.
 * - {@link PrivateKeyJwtAuthConfig} — OAuth 2.0 client credentials using a private key JWT assertion.
 * - {@link AccessTokenAuthConfig} — A pre-obtained bearer token.
 */
export type TsgSdkAuthConfig =
  | ClientSecretAuthConfig
  | PrivateKeyJwtAuthConfig
  | AccessTokenAuthConfig;

/**
 * Authenticate using the OAuth 2.0 `client_credentials` grant with a
 * client ID and client secret sent via POST body.
 */
export interface ClientSecretAuthConfig {
  method: "client_secret_post";
  clientId: string;
  clientSecret: string;
  /** OpenID configuration URL. Defaults to `${ssoBridgeBaseUrl}/.well-known/openid-configuration` */
  openIdConfigurationUrl?: string;
}

/**
 * Authenticate using the OAuth 2.0 `client_credentials` grant with a
 * signed JWT assertion (`private_key_jwt` client authentication method).
 *
 * Supported key types: EC (P-256 / P-384), OKP (Ed25519), and RSA.
 */
export interface PrivateKeyJwtAuthConfig {
  method: "private_key_jwt";
  clientId: string;
  privateKeyJwk: JsonWebKey;
  /** OpenID configuration URL. Defaults to `${ssoBridgeBaseUrl}/.well-known/openid-configuration` */
  openIdConfigurationUrl?: string;
}

/**
 * Skip token acquisition and use a pre-obtained access token directly.
 *
 * Useful for short-lived scripts or when tokens are managed externally.
 * The SDK will not attempt to refresh the token when it expires.
 */
export interface AccessTokenAuthConfig {
  method: "access_token";
  /** A pre-obtained access token to use directly */
  accessToken: string;
}
