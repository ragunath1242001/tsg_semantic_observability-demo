import { AuthProvider } from "./auth/auth.provider.js";
import { CatalogSdk } from "./catalog/catalog.sdk.js";
import {
  createControlPlaneClient,
  createSsoBridgeClient,
  createWalletClient
} from "./client.js";
import type { TsgSdkConfig } from "./config/sdk.config.js";
import { NegotiationSdk } from "./negotiations/negotiations.sdk.js";
import { SsoSdk } from "./sso/sso.sdk.js";
import { TransferSdk } from "./transfers/transfers.sdk.js";
import { SdkError, SdkErrorCode } from "./utils/errors.js";
import { WalletSdk } from "./wallet/wallet.sdk.js";

/**
 * Main entry point for the TSG SDK.
 *
 * Provides access to all TSG Dataspace Protocol capabilities through
 * dedicated sub-modules: {@link CatalogSdk | catalog}, {@link NegotiationSdk | negotiations},
 * {@link TransferSdk | transfers}, {@link WalletSdk | wallet}, and {@link SsoSdk | sso}.
 *
 * Use the static {@link TsgSdk.create} factory to instantiate.
 * @example
 * ```ts
 * import { TsgSdk } from "@tsg-dsp/tsg-sdk";
 *
 * const sdk = TsgSdk.create({
 *   controlPlaneBaseUrl: "http://localhost:3501",
 *   walletBaseUrl: "http://localhost:3500",
 *   ssoBridgeBaseUrl: "http://localhost:3700",
 *   auth: {
 *     method: "client_secret_post",
 *     clientId: "my-client",
 *     clientSecret: "my-secret",
 *   },
 * });
 *
 * const catalog = await sdk.catalog.getOwnCatalog();
 * ```
 */
export class TsgSdk {
  /** Browse and discover datasets from local and remote catalogs. */
  readonly catalog: CatalogSdk;
  /** Manage the full lifecycle of contract negotiations. */
  readonly negotiations: NegotiationSdk;
  /** Request, monitor, and control data transfer processes. */
  readonly transfers: TransferSdk;
  /** Manage keys, credentials, DIDs, and credential issuance. Requires `walletBaseUrl` in config. */
  readonly wallet: WalletSdk;
  /** OpenID Connect integration, token management, and user/client administration. Requires `ssoBridgeBaseUrl` in config. */
  readonly sso: SsoSdk;

  private constructor(
    catalog: CatalogSdk,
    negotiations: NegotiationSdk,
    transfers: TransferSdk,
    wallet: WalletSdk,
    sso: SsoSdk
  ) {
    this.catalog = catalog;
    this.negotiations = negotiations;
    this.transfers = transfers;
    this.wallet = wallet;
    this.sso = sso;
  }

  /**
   * Create a new `TsgSdk` instance from the provided configuration.
   *
   * Only `controlPlaneBaseUrl` is required. The `wallet` and `sso` modules
   * are automatically enabled when their respective base URLs are provided.
   * Calling a method on a module that has not been configured throws a
   * {@link SdkError} with code {@link SdkErrorCode.NOT_CONFIGURED}.
   * @param config - SDK configuration including base URLs and optional auth settings.
   * @returns A fully initialised `TsgSdk` instance.
   */
  static create(config: TsgSdkConfig): TsgSdk {
    const authProvider = new AuthProvider(config.auth, config.ssoBridgeBaseUrl);
    const cpClient = createControlPlaneClient(
      config.controlPlaneBaseUrl,
      authProvider
    );

    const catalog = new CatalogSdk(cpClient);
    const negotiations = new NegotiationSdk(cpClient);
    const transfers = new TransferSdk(cpClient);

    // Wallet: requires walletBaseUrl
    let wallet: WalletSdk;
    if (config.walletBaseUrl) {
      const walletClient = createWalletClient(
        config.walletBaseUrl,
        authProvider
      );
      wallet = new WalletSdk(walletClient);
    } else {
      wallet = createUnconfiguredProxy<WalletSdk>("wallet", "walletBaseUrl");
    }

    // SSO: requires ssoBridgeBaseUrl
    let sso: SsoSdk;
    if (config.ssoBridgeBaseUrl) {
      const ssoBridgeClient = createSsoBridgeClient(
        config.ssoBridgeBaseUrl,
        authProvider
      );
      sso = new SsoSdk(config.ssoBridgeBaseUrl, config.auth, ssoBridgeClient);
    } else {
      sso = createUnconfiguredProxy<SsoSdk>("sso", "ssoBridgeBaseUrl");
    }

    return new TsgSdk(catalog, negotiations, transfers, wallet, sso);
  }
}

/**
 * Creates a proxy that throws a {@link SdkError} with code
 * {@link SdkErrorCode.NOT_CONFIGURED} when any method is called on a
 * module whose required base URL was not provided in the SDK configuration.
 * @param moduleName - Human-readable module name used in the error message.
 * @param requiredConfig - The config property that must be set to enable the module.
 * @returns A proxy object that throws on any method invocation.
 * @internal
 */
function createUnconfiguredProxy<T extends object>(
  moduleName: string,
  requiredConfig: string
): T {
  const createError = () =>
    new SdkError(
      `${moduleName} module is not configured. Provide '${requiredConfig}' in TsgSdkConfig.`,
      SdkErrorCode.NOT_CONFIGURED
    );

  const createNestedProxy = (): object =>
    new Proxy(
      function unconfiguredModule() {
        throw createError();
      },
      {
        apply() {
          throw createError();
        },
        get(_target, prop) {
          if (typeof prop === "symbol" || prop === "then") {
            return undefined;
          }
          return createNestedProxy();
        }
      }
    );

  return createNestedProxy() as T;
}
