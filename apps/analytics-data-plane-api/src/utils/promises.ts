import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";

export const promiseAllOrThrow = async <T, U>(
  array: T[] | undefined,
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
  logger: Logger
): Promise<U[]> => {
  if (!array) return [];
  const promises = await Promise.allSettled(array.map(callbackfn));
  if (promises.some((p) => p.status === "rejected")) {
    promises
      .filter((p) => p.status === "rejected")
      .forEach((p) => {
        if (p.reason instanceof AppError) {
          p.reason.andLog(logger, "error", true);
        } else {
          logger.error(
            `Error in executing promise: ${p.reason instanceof Error ? p.reason.message : p.reason}`
          );
        }
      });

    throw new AppError(
      `Error in executing promises: ${promises
        .filter((p) => p.status === "rejected")
        .map((p) => p.reason.message)
        .join(" | ")}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      promises.filter((p) => p.status === "rejected").map((p) => p.reason)
    );
  }
  return promises.map((p) => (p as PromiseFulfilledResult<U>).value);
};
