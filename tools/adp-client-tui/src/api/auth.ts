import { createHash, randomBytes } from "node:crypto";
import { URL, URLSearchParams } from "node:url";

import axios from "axios";

import type { TokenResponse } from "../types.js";
import { getErrorMessage } from "../utils.js";

/**
 * Performs headless username/password login against the SSO Bridge OAuth
 * endpoint. This avoids needing a browser — suited for SSH/VM environments.
 *
 * Flow:
 *  1. Generate PKCE code_verifier + code_challenge
 *  2. POST /api/oauth/login with credentials + PKCE params (redirect=false)
 *  3. Parse the authorization code from the returned URL
 *  4. Exchange code for tokens via POST /api/oauth/token
 */
export async function performCredentialLogin(
  baseUrl: string,
  ssoUrl: string,
  clientId: string,
  username: string,
  password: string,
  onStatus?: (message: string) => void,
  onTotpRequired?: () => Promise<string>
): Promise<TokenResponse> {
  const log = onStatus ?? (() => {});

  const ssoBase = ssoUrl.endsWith("/") ? ssoUrl.slice(0, -1) : ssoUrl;

  // 1. Generate PKCE pair
  const codeVerifier = randomBytes(32)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9\-._~]/g, "");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const state = randomBytes(16).toString("hex");

  // Use a placeholder redirect URI — the SSO Bridge validates the pattern
  // but with redirect=false the redirect doesn't actually happen.
  const redirectUri = `${baseUrl}/callback`;

  // 2. POST to the OAuth login endpoint with credentials
  log("Authenticating with SSO Bridge...");

  const loginUrl = new URL(`${ssoBase}/api/oauth/login`);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("client_id", clientId);
  loginUrl.searchParams.set("redirect_uri", redirectUri);
  loginUrl.searchParams.set("code_challenge", codeChallenge);
  loginUrl.searchParams.set("code_challenge_method", "S256");
  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("redirect", "false");

  let loginRes;
  try {
    loginRes = await axios.post<
      | { url: string; user: unknown }
      | {
          status: string;
          hasTotpCredentials: boolean;
          hasWebAuthnCredentials: boolean;
        }
    >(
      loginUrl.toString(),
      { username, password },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const msg = getErrorMessage(error, "Unknown error");

    if (status === 401) {
      throw new Error("Invalid username or password");
    }
    if (status === 403) {
      throw new Error(
        "Login forbidden — " +
          msg +
          " (2FA setup may be required via the web UI first)"
      );
    }
    throw new Error(`SSO login failed: ${msg}`);
  }

  // 2b. Handle 2FA challenge
  if ("status" in loginRes.data && loginRes.data.status === "2fa_required") {
    if (!loginRes.data.hasTotpCredentials) {
      throw new Error(
        "Your account only has passkey-based 2FA configured. " +
          "Please set up TOTP (authenticator app) via the web UI to use the CLI."
      );
    }
    if (!onTotpRequired) {
      throw new Error(
        "Two-factor authentication is required but no TOTP handler was provided"
      );
    }

    log("Two-factor authentication required…");
    const totpToken = await onTotpRequired();

    try {
      loginRes = await axios.post<{ url: string; user: unknown }>(
        loginUrl.toString(),
        { username, password, totp_token: totpToken },
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error: unknown) {
      const msg = getErrorMessage(error, "Unknown error");
      throw new Error(`2FA verification failed: ${msg}`);
    }
  }

  // 3. Extract authorization code from the returned URL
  const returnedUrl = new URL((loginRes.data as { url: string }).url);
  const code = returnedUrl.searchParams.get("code");
  if (!code) {
    throw new Error(
      "SSO login succeeded but no authorization code was returned"
    );
  }

  // 4. Exchange code for tokens
  log("Exchanging authorization code for tokens...");

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    redirect_uri: redirectUri
  });

  const tokenRes = await axios.post<TokenResponse>(
    `${ssoBase}/api/oauth/token`,
    tokenParams.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }
  );

  log("Authentication successful!");
  return tokenRes.data;
}
