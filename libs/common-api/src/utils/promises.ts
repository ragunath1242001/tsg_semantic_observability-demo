import { HttpStatus } from "@nestjs/common";
import { AppError } from "./error.js";

export const isRejected = (
  input: PromiseSettledResult<unknown>
): input is PromiseRejectedResult => input.status === "rejected";

export const isFulfilled = <T>(
  input: PromiseSettledResult<T>
): input is PromiseFulfilledResult<NonNullable<T>> =>
  input.status === "fulfilled" && input.value !== undefined;

export const promiseMap = async <T, U>(
  array: T[] | undefined,
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
  thisArg?: any
): Promise<U[]> => {
  if (!array) return [];
  const promises = await Promise.allSettled(array.map(callbackfn, thisArg));
  if (promises.some((p) => p.status === "rejected")) {
    throw new AppError(
      `Error in executing promises: ${promises
        .filter((p) => p.status === "rejected")
        .map((p) => p.reason.message)
        .join(" | ")}`,
      HttpStatus.OK,
      promises.filter((p) => p.status === "rejected").map((p) => p.reason)
    );
  }
  return promises.map((p) => (p as PromiseFulfilledResult<U>).value);
};
