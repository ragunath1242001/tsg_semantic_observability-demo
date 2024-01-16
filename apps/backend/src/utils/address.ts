
export function normalizeAddress(address: string, sliceLast: number, ...paths: string[]): string {
  const addressTmp = address.endsWith("/") ? address.slice(0, -1) : address;
  for (let i = 0; i < paths.length; i++) {
    const subpath = paths.slice(0, paths.length - i);
    if (addressTmp.endsWith(subpath.join("/"))) {
      return i == 0 ? addressTmp : addressTmp + "/" + paths.slice(i, paths.length-sliceLast).join("/");
    }
  }
  return addressTmp + "/" + paths.slice(0, paths.length-sliceLast).join("/");
}
