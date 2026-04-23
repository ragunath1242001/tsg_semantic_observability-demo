import { SdkError, SdkErrorCode } from "./errors.js";

/**
 * Configuration for polling operations used by `waitFor*` methods.
 */
export interface PollingOptions {
  /** Polling interval in milliseconds. Defaults to `1000`. */
  intervalMs?: number;
  /** Maximum number of polling attempts before timing out. Defaults to `20`. */
  maxRetries?: number;
}

const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_MAX_RETRIES = 20;

/**
 * Poll an async function until a predicate is satisfied, or max retries are exceeded.
 * @typeParam T - The return type of the polled function.
 * @param fn - Async function to call on each polling attempt.
 * @param predicate - Returns `true` when the desired state is reached.
 * @param options - Polling interval and retry configuration.
 * @returns The result of `fn` when `predicate` returns `true`.
 * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} when `maxRetries` is exceeded.
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options?: PollingOptions
): Promise<T> {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fn();
    if (predicate(result)) {
      return result;
    }
    if (attempt < maxRetries - 1) {
      await delay(intervalMs);
    }
  }

  throw new SdkError(
    `Polling timed out after ${maxRetries} attempts`,
    SdkErrorCode.POLLING_TIMEOUT
  );
}

/**
 * Wait for the given number of milliseconds.
 * @param ms - Delay duration in milliseconds.
 * @returns A promise that resolves after the delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
