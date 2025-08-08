import { Logger } from "@nestjs/common";

export async function retry<T>(
  fn: () => Promise<T>,
  action: string,
  retries: number = 8,
  backOff: number = 100
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    Logger.log(
      `Could not ${action}, retrying in ${(backOff / 1000).toFixed(2)} seconds`,
      "RetryUtil"
    );
    await new Promise((resolve) => setTimeout(resolve, backOff));
    return retry(fn, action, retries - 1, backOff * 2);
  }
}
