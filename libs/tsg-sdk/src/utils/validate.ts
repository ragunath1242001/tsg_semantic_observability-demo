import {
  ContextDto,
  deserialize,
  SerializableClass
} from "@tsg-dsp/common-dsp";
import { type ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { SdkError, SdkErrorCode } from "./errors.js";

/**
 * Infer the raw DTO type from a JSON-LD serializable class.
 *
 * For example, `DtoOf<Catalog>` resolves to `CatalogDto`.
 */
export type DtoOf<T> = T extends SerializableClass<infer DTO> ? DTO : never;

/**
 * Validate an API response against a DTO class.
 *
 * Creates a class instance from the plain data, runs `class-validator` checks,
 * and throws a descriptive error if validation fails. Returns the transformed
 * class instance so `class-transformer` conversions such as `Date` coercion are
 * preserved for SDK consumers.
 * @typeParam T - The DTO class type.
 * @param dto - The class constructor to validate against.
 * @param data - The plain object received from the API.
 * @returns A validated instance of `T`.
 * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.VALIDATION_FAILED} if validation errors are found.
 */
export function validateResponse<T extends object>(
  dto: ClassConstructor<T>,
  data: object
): T {
  const instance = plainToInstance(dto, data);
  const errors = validateSync(instance, {
    whitelist: false,
    forbidUnknownValues: false
  });
  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new SdkError(
      `Invalid ${dto.name} response: ${messages.join("; ")}`,
      SdkErrorCode.VALIDATION_FAILED
    );
  }
  return instance;
}

/**
 * Validate an array of API responses against a DTO class.
 *
 * Each item is validated individually using {@link validateResponse}.
 * @typeParam T - The DTO class type.
 * @param dto - The class constructor to validate against.
 * @param data - The array of plain objects received from the API.
 * @returns An array of validated instances of `T`.
 * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.VALIDATION_FAILED} if any item fails validation.
 */
export function validateResponseArray<T extends object>(
  dto: ClassConstructor<T>,
  data: object[]
): T[] {
  return data.map((item) => validateResponse(dto, item));
}

/**
 * Deserialize and validate a JSON-LD API response.
 *
 * Uses the `@tsg-dsp/common-dsp` deserializer to convert JSON-LD payloads
 * into typed class instances.
 * @typeParam T - The target serializable class type.
 * @param data - The raw JSON-LD data from the API.
 * @param returnDto - When `true`, returns the raw DTO-shaped data instead of the deserialized class instance.
 * @returns The deserialized class instance, or the raw DTO when `returnDto` is `true`.
 */
export async function validateJsonLD<T extends SerializableClass<ContextDto>>(
  data: unknown,
  returnDto: true
): Promise<DtoOf<T>>;
export async function validateJsonLD<T extends SerializableClass<ContextDto>>(
  data: unknown,
  returnDto?: false
): Promise<T>;
export async function validateJsonLD<T extends SerializableClass<ContextDto>>(
  data: unknown,
  returnDto: boolean
): Promise<T | DtoOf<T>>;
export async function validateJsonLD<T extends SerializableClass<ContextDto>>(
  data: unknown,
  returnDto: boolean = false
): Promise<T | DtoOf<T>> {
  const deserialized = await deserialize<T>(data);
  if (returnDto) {
    return data as DtoOf<T>;
  }
  return deserialized;
}
