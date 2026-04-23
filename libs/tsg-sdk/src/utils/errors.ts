/**
 * Structured error class thrown by all SDK operations.
 *
 * Every `SdkError` carries a machine-readable {@link SdkErrorCode} that can be
 * used for programmatic error handling, along with an optional HTTP
 * `statusCode` and the original `cause`.
 * @example
 * ```ts
 * import { SdkError, SdkErrorCode } from "@tsg-dsp/tsg-sdk";
 *
 * try {
 *   await sdk.catalog.getDataset(id, audience);
 * } catch (err) {
 *   if (err instanceof SdkError && err.code === SdkErrorCode.NOT_FOUND) {
 *     console.log("Dataset not found");
 *   }
 * }
 * ```
 */
export class SdkError extends Error {
  constructor(
    message: string,
    /** Machine-readable error code. */
    public readonly code: SdkErrorCode,
    /** HTTP status code, when the error originated from an HTTP response. */
    public readonly statusCode?: number,
    /** The underlying error that caused this SDK error. */
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SdkError";
  }
}

/**
 * Machine-readable error codes used by {@link SdkError}.
 */
export enum SdkErrorCode {
  /** HTTP request failed */
  REQUEST_FAILED = "REQUEST_FAILED",
  /** Authentication failed (token acquisition, invalid credentials) */
  AUTH_FAILED = "AUTH_FAILED",
  /** Resource not found */
  NOT_FOUND = "NOT_FOUND",
  /** Polling timed out before reaching target state */
  POLLING_TIMEOUT = "POLLING_TIMEOUT",
  /** Invalid SDK configuration */
  INVALID_CONFIG = "INVALID_CONFIG",
  /** Feature not configured (e.g. wallet not configured) */
  NOT_CONFIGURED = "NOT_CONFIGURED",
  /** API response did not pass DTO validation */
  VALIDATION_FAILED = "VALIDATION_FAILED"
}

/**
 * Create an {@link SdkError} from an HTTP error response.
 *
 * Maps HTTP status codes to appropriate {@link SdkErrorCode} values:
 * - `404` → {@link SdkErrorCode.NOT_FOUND}
 * - `401` / `403` → {@link SdkErrorCode.AUTH_FAILED}
 * - All others → {@link SdkErrorCode.REQUEST_FAILED}
 * @param message - Human-readable error message.
 * @param statusCode - The HTTP status code.
 * @param cause - Optional underlying error.
 * @returns A new `SdkError` instance.
 */
export function createRequestError(
  message: string,
  statusCode: number,
  cause?: unknown
): SdkError {
  if (statusCode === 404) {
    return new SdkError(message, SdkErrorCode.NOT_FOUND, statusCode, cause);
  }
  if (statusCode === 401 || statusCode === 403) {
    return new SdkError(message, SdkErrorCode.AUTH_FAILED, statusCode, cause);
  }
  return new SdkError(message, SdkErrorCode.REQUEST_FAILED, statusCode, cause);
}
