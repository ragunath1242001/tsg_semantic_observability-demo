export type GrantType =
  | "authorization_code"
  | "refresh_token"
  | "client_credentials"
  | "password";

export type ClientAuthMethod =
  | "client_secret_post"
  | "private_key_jwt"
  | "none";
