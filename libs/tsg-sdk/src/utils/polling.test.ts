import { beforeEach, describe, expect, it, vi } from "vitest";

import { SdkErrorCode } from "./errors.js";
import { pollUntil } from "./polling.js";

describe("pollUntil", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return immediately if predicate is true on first call", async () => {
    const fn = vi.fn().mockResolvedValue({ state: "DONE" });
    const result = await pollUntil(fn, (r) => r.state === "DONE");
    expect(result.state).toBe("DONE");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should poll until predicate is satisfied", async () => {
    let count = 0;
    const fn = vi.fn().mockImplementation(async () => {
      count++;
      return { state: count >= 3 ? "DONE" : "PENDING" };
    });

    const result = await pollUntil(fn, (r) => r.state === "DONE", {
      intervalMs: 10,
      maxRetries: 10
    });
    expect(result.state).toBe("DONE");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should throw POLLING_TIMEOUT when max retries exceeded", async () => {
    const fn = vi.fn().mockResolvedValue({ state: "PENDING" });

    await expect(
      pollUntil(fn, (r) => r.state === "DONE", {
        intervalMs: 10,
        maxRetries: 3
      })
    ).rejects.toMatchObject({
      code: SdkErrorCode.POLLING_TIMEOUT
    });

    expect(fn).toHaveBeenCalledTimes(3);
  });
});
