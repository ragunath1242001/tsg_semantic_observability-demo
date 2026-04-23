/**
 * SSO SDK Example
 *
 * Demonstrates SSO bridge interactions: token management,
 * OpenID Connect discovery, and user/client management.
 */
import { TsgSdk } from "@tsg-dsp/tsg-sdk";

async function main() {
  const sdk = TsgSdk.create({
    controlPlaneBaseUrl: "http://localhost:3000",
    ssoBridgeBaseUrl: "http://localhost:3002",
    auth: {
      method: "client_secret_post",
      clientId: "my-client",
      clientSecret: "my-secret"
    }
  });

  // ── Get access token ───────────────────────────────────────────────────
  console.log("Acquiring access token...");
  const token = await sdk.sso.getAccessToken();
  console.log(`Token acquired: ${token.substring(0, 30)}...`);

  // ── OpenID Connect discovery ───────────────────────────────────────────
  console.log("\nOpenID Configuration:");
  const config = await sdk.sso.getOpenIdConfiguration();
  console.log(`  Issuer: ${config.issuer}`);
  console.log(`  Token endpoint: ${config.token_endpoint}`);

  console.log("\nJWKS:");
  const jwks = await sdk.sso.getJwks();
  console.log(`  ${jwks.keys.length} keys available`);

  // ── Authorization code flow ────────────────────────────────────────────
  // Exchange an authorization code for tokens (typically in a callback handler)
  // const tokens = await sdk.sso.exchangeAuthorizationCode(
  //   authCode,
  //   "http://localhost:8080/callback",
  //   "my-client",
  //   pkceCodeVerifier
  // );
  // console.log("Access token:", tokens.access_token);

  // ── Refresh token ──────────────────────────────────────────────────────
  // const refreshed = await sdk.sso.refreshAccessToken(
  //   refreshToken,
  //   "my-client"
  // );

  // ── User management ────────────────────────────────────────────────────
  console.log("\nUsers:");
  const users = await sdk.sso.management.getUsers({ page: 1, perPage: 10 });
  console.log(`  Found ${Array.isArray(users) ? users.length : 0} users`);

  // Create a user
  // const newUser = await sdk.sso.management.createUser({
  //   username: "alice",
  //   password: "secure-password",
  // });

  // ── Client management ──────────────────────────────────────────────────
  console.log("\nOAuth Clients:");
  const clients = await sdk.sso.management.getClients();
  console.log(`  Found ${Array.isArray(clients) ? clients.length : 0} clients`);

  // ── Permissions ────────────────────────────────────────────────────────
  console.log("\nPermissions:");
  const permissions = await sdk.sso.management.getPermissions();
  console.log(`  ${JSON.stringify(permissions)}`);
}

main().catch(console.error);
