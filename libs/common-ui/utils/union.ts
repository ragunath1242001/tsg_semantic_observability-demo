export function toArray<T>(arrayLike: T | T[] | undefined): T[] {
  if (!arrayLike) {
    return [];
  }
  if (arrayLike instanceof Array) {
    return arrayLike;
  }
  return [arrayLike];
}
