import { describe, expect, it } from "vitest";

import { createRequestError, SdkError, SdkErrorCode } from "./errors.js";

describe("SdkError", () => {
  it("should create error with code and message", () => {
    const error = new SdkError("test error", SdkErrorCode.REQUEST_FAILED);
    expect(error.message).toBe("test error");
    expect(error.code).toBe(SdkErrorCode.REQUEST_FAILED);
    expect(error.name).toBe("SdkError");
    expect(error.statusCode).toBeUndefined();
  });

  it("should create error with status code and cause", () => {
    const cause = new Error("original");
    const error = new SdkError(
      "test error",
      SdkErrorCode.AUTH_FAILED,
      401,
      cause
    );
    expect(error.statusCode).toBe(401);
    expect(error.cause).toBe(cause);
  });
});

describe("createRequestError", () => {
  it("should return NOT_FOUND for 404 status", () => {
    const error = createRequestError("not found", 404);
    expect(error.code).toBe(SdkErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
  });

  it("should return AUTH_FAILED for 401 status", () => {
    const error = createRequestError("unauthorized", 401);
    expect(error.code).toBe(SdkErrorCode.AUTH_FAILED);
    expect(error.statusCode).toBe(401);
  });

  it("should return AUTH_FAILED for 403 status", () => {
    const error = createRequestError("forbidden", 403);
    expect(error.code).toBe(SdkErrorCode.AUTH_FAILED);
    expect(error.statusCode).toBe(403);
  });

  it("should return REQUEST_FAILED for other status codes", () => {
    const error = createRequestError("server error", 500);
    expect(error.code).toBe(SdkErrorCode.REQUEST_FAILED);
    expect(error.statusCode).toBe(500);
  });

  it("should pass through cause", () => {
    const cause = new Error("original");
    const error = createRequestError("error", 500, cause);
    expect(error.cause).toBe(cause);
  });
});
