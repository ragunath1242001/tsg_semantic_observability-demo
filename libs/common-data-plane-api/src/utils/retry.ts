import { HttpStatus, Logger } from "@nestjs/common";

import { DataPlaneClientError } from "../errors/index.js";

export async function retryWithBackoff<T>(
  operation: () => Promise<T | undefined | null>,
  errorMessage: string,
  retries: number = 7,
  delay: number = 100
): Promise<T> {
  if (retries <= 0) {
    new Logger("RetryWithBackoff").error(errorMessage);
    throw new DataPlaneClientError(errorMessage, HttpStatus.BAD_REQUEST);
  }
  await new Promise((resolve) => setTimeout(resolve, delay));
  try {
    const result = await operation();
    if (result) {
      return result;
    }
  } catch (err) {
    new Logger("RetryWithBackoff").debug(`Retry attempt failed: ${err}`);
  }
  return retryWithBackoff(
    operation,
    errorMessage,
    retries - 1,
    delay * 2 // Exponential backoff
  );
}
