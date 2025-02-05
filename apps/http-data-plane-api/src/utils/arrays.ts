export function defArray<T>(...values: Array<T | undefined | null>): Array<T> {
  return values.filter((x) => x != null);
}
