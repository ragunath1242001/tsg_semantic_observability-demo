import { AppError } from "@tsg-dsp/common-api";
import { Field } from "@tsg-dsp/common-dtos";

import { validateField } from "./field-validation.js";

describe("Field Validation", () => {
  it("should validate a field that exists", () => {
    const fieldDescriptor: Field = {
      name: "test-field",
      path: ["$.testField"]
    };
    const vpJson = { testField: "test-value" };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(false);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(true);
  });
  it("should validate a field that exists and matches filter", () => {
    const fieldDescriptor = {
      name: "test-field",
      path: ["$.testField"],
      filter: {
        type: "string",
        pattern: "^test-value$"
      }
    };
    const vpJson = { testField: "test-value" };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(false);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(true);
  });

  it("should handle optional fields that don't exist", () => {
    const fieldDescriptor = {
      name: "optional-field",
      path: ["$.nonExistentField"],
      optional: true
    };
    const vpJson = { testField: "test-value" };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(false);
    expect(result.found).toBe(false);
    expect(result.validated).toBe(false);
  });

  it("should return error for required fields that don't exist", () => {
    const fieldDescriptor = {
      name: "required-field",
      path: ["$.nonExistentField"]
    };
    const vpJson = { testField: "test-value" };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(true);
    expect(result.found).toBe(false);
  });

  it("should validate array fields", () => {
    const fieldDescriptor: Field = {
      name: "array-field",
      path: ["$.arrayField"],
      filter: {
        type: "array",
        items: {}
      }
    };
    const vpJson = { arrayField: ["test1", "test2"] };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(false);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(true);
  });

  it("should throw error for required fields that don't exist when throwOnError is undefined", () => {
    const fieldDescriptor = {
      name: "required-field",
      path: ["$.nonExistentField"]
    };
    const vpJson = { testField: "test-value" };
    expect(() => validateField(fieldDescriptor, vpJson)).toThrow(AppError);
  });
  it("should validate filter with string pattern", () => {
    const fieldDescriptor = {
      name: "test-field",
      path: ["$.testField"],
      filter: {
        type: "string",
        pattern: "^test-value$"
      }
    };
    const vpJson = { testField: "test-value" };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(false);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(true);
  });
  it("should validate filter with incorrect string pattern", () => {
    const fieldDescriptor = {
      name: "test-field",
      path: ["$.testField"],
      filter: {
        type: "string",
        pattern: "^test-value$"
      }
    };
    const vpJson = { testField: "wrong-value" };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(true);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(false);
    expect(() => validateField(fieldDescriptor, vpJson, true)).toThrow(
      AppError
    );
  });
  it("should validate filter with multiple values", () => {
    const fieldDescriptor = {
      name: "multi-condition-field",
      path: ["$.multiField"],
      filter: {
        type: "string",
        pattern: "^test-value(-2)?$"
      }
    };
    const vpJson = { multiField: ["test-value", "test-value-2"] };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(false);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(true);
  });
  it("should validate filter with missing values", () => {
    const fieldDescriptor = {
      name: "multi-condition-field",
      path: ["$.multiField"],
      filter: {
        type: "string",
        pattern: "^test-value$"
      }
    };
    const vpJson = { multiField: ["test-value-2"] };
    const result = validateField(fieldDescriptor, vpJson, false);
    expect(result.error).toBe(true);
    expect(result.found).toBe(true);
    expect(result.validated).toBe(false);
    expect(() => validateField(fieldDescriptor, vpJson, true)).toThrow(
      AppError
    );
  });
});
