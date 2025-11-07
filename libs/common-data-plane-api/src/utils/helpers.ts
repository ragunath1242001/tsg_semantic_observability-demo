/**
 * Utility types and helpers for data plane implementations
 */

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Ensure an array exists
 */
export function defArray<T>(value: T[] | undefined): T[] {
  return value ?? [];
}
