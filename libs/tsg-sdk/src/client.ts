/**
 * Typed API clients powered by openapi-fetch and generated OpenAPI types.
 *
 * The generated types in `.generated/` contain all path definitions, request
 * parameters, and response schemas derived from the NestJS controller OpenAPI
 * specs.  openapi-fetch uses those types to provide compile-time validation of
 * every HTTP call the SDK makes.
 */
import createClient, { type Client, type Middleware } from "openapi-fetch";

import type { paths as ControlPlanePaths } from "../.generated/control-plane.js";
import type { paths as SsoBridgePaths } from "../.generated/sso-bridge.js";
import type { paths as WalletPaths } from "../.generated/wallet.js";
import type { AuthProvider } from "./auth/auth.provider.js";
import { createRequestError } from "./utils/errors.js";

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * Creates middleware that attaches an `Authorization: Bearer <token>` header
 * to every outgoing request using the given {@link AuthProvider}.
 * @param authProvider - Provider that supplies access tokens.
 * @returns An openapi-fetch {@link Middleware} instance.
 * @internal
 */
function authMiddleware(authProvider: AuthProvider): Middleware {
  return {
    async onRequest({ request }) {
      const headers = await authProvider.getAuthHeaders();
      for (const [key, value] of Object.entries(headers)) {
        request.headers.set(key, value);
      }
      return request;
    }
  };
}

/**
 * Middleware that intercepts non-OK HTTP responses and converts them into
 * typed {@link SdkError} instances with the appropriate {@link SdkErrorCode}.
 * @internal
 */
const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      const body = await response
        .clone()
        .text()
        .catch(() => "");
      throw createRequestError(
        `Request failed (${response.status}): ${body}`,
        response.status
      );
    }
    return response;
  }
};

// ── Client factories ───────────────────────────────────────────────────────

/**
 * Create a typed HTTP client for the TSG Control Plane API.
 * @param baseUrl - Base URL of the control plane (e.g. `"http://localhost:3501"`).
 * @param authProvider - Provider that supplies access tokens for authenticated requests.
 * @returns A fully typed openapi-fetch client bound to the control plane OpenAPI schema.
 */
export function createControlPlaneClient(
  baseUrl: string,
  authProvider: AuthProvider
): Client<ControlPlanePaths> {
  const client = createClient<ControlPlanePaths>({ baseUrl });
  client.use(authMiddleware(authProvider));
  client.use(errorMiddleware);
  return client;
}

/**
 * Create a typed HTTP client for the TSG Wallet API.
 * @param baseUrl - Base URL of the wallet (e.g. `"http://localhost:3500"`).
 * @param authProvider - Provider that supplies access tokens for authenticated requests.
 * @returns A fully typed openapi-fetch client bound to the wallet OpenAPI schema.
 */
export function createWalletClient(
  baseUrl: string,
  authProvider: AuthProvider
): Client<WalletPaths> {
  const client = createClient<WalletPaths>({ baseUrl });
  client.use(authMiddleware(authProvider));
  client.use(errorMiddleware);
  return client;
}

/**
 * Create a typed HTTP client for the TSG SSO Bridge API.
 * @param baseUrl - Base URL of the SSO bridge (e.g. `"http://localhost:3700"`).
 * @param authProvider - Provider that supplies access tokens for authenticated requests.
 * @returns A fully typed openapi-fetch client bound to the SSO bridge OpenAPI schema.
 */
export function createSsoBridgeClient(
  baseUrl: string,
  authProvider: AuthProvider
): Client<SsoBridgePaths> {
  const client = createClient<SsoBridgePaths>({ baseUrl });
  client.use(authMiddleware(authProvider));
  client.use(errorMiddleware);
  return client;
}

// ── Exported client types ──────────────────────────────────────────────────

/** Typed HTTP client for the TSG Control Plane API. */
export type ControlPlaneClient = Client<ControlPlanePaths>;
/** Typed HTTP client for the TSG Wallet API. */
export type WalletClient = Client<WalletPaths>;
/** Typed HTTP client for the TSG SSO Bridge API. */
export type SsoBridgeClient = Client<SsoBridgePaths>;
