/** Supported OAuth 2.0 / authentication methods for the SDK. */
export type AuthMethod =
  | "client_secret_post"
  | "private_key_jwt"
  | "access_token";

/** Response from an OAuth 2.0 token endpoint. */
export interface TokenResponse {
  /** The issued access token. */
  access_token: string;
  /** Token type, typically `"Bearer"`. */
  token_type: string;
  /** Number of seconds until the token expires. */
  expires_in?: number;
  /** Space-delimited list of granted scopes. */
  scope?: string;
}

/** Subset of an OpenID Connect discovery document used by the SDK. */
export interface OpenIDConfiguration {
  /** The issuer identifier of the OpenID provider. */
  issuer: string;
  /** URL of the token endpoint. */
  token_endpoint: string;
  /** URL of the authorization endpoint. */
  authorization_endpoint?: string;
  /** URL of the JSON Web Key Set document. */
  jwks_uri: string;
  /** Additional OpenID configuration fields. */
  [key: string]: unknown;
}
