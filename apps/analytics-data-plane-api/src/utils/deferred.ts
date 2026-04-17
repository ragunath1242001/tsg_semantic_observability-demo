import { Logger } from "@nestjs/common";

/**
 * Schedule an async function to run on the next tick via `setImmediate`,
 * catching and logging any errors. Optionally invoke an `onError` callback
 * to allow the caller to react (e.g. mark a resource as failed).
 */
export function runDeferred(
  fn: () => Promise<void>,
  logger: Logger,
  onError?: (error: unknown) => void | Promise<void>
): void {
  setImmediate(async () => {
    try {
      await fn();
    } catch (error) {
      logger.error(
        `Deferred task failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      try {
        await onError?.(error);
      } catch (onErrorErr) {
        logger.error(
          `onError handler failed: ${onErrorErr instanceof Error ? onErrorErr.message : String(onErrorErr)}`,
          onErrorErr instanceof Error ? onErrorErr.stack : undefined
        );
      }
    }
  });
}
