
export function toArray<T>(arrayUnion: T | T[] | undefined): T[] {
  if (!arrayUnion) {
    return []
  }
  if (arrayUnion instanceof Array) {
    return arrayUnion;
  }
  return [arrayUnion];
}