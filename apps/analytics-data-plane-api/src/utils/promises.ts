import { HttpStatus } from "@nestjs/common";
import { DataPlaneError } from "./errors/error";

export const promiseMap = async <T, U>(
  array: T[] | undefined,
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
  thisArg?: any,
): Promise<U[]> => {
  if (!array) return [];
  const promises = await Promise.allSettled(array.map(callbackfn, thisArg));
  if (promises.some((p) => p.status === "rejected")) {
    throw new DataPlaneError(
      `Error in executing promises: ${promises
        .filter((p) => p.status === "rejected")
        .map((p) => p.reason.message)
        .join(" | ")}`,
      HttpStatus.OK,
      promises.filter((p) => p.status === "rejected").map((p) => p.reason),
    );
  }
  return promises.map((p) => (p as PromiseFulfilledResult<U>).value);
};
