export type OrArray<T> = T | T[];

export function toArray<T>(arrayUnion: T | T[] | undefined): T[] {
  if (!arrayUnion) {
    return [];
  }
  if (Array.isArray(arrayUnion)) {
    return arrayUnion;
  }
  return [arrayUnion];
}
