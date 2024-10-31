import { base58btc } from "multiformats/bases/base58";

export function base64urlToHex(s: string): string {
  return Buffer.from(s, "base64url").toString("hex");
}
export function hexToBase58btc(s: string): string {
  return base58btc.encode(Buffer.from(s, "hex"));
}
export function hexToBase64url(s: string): string {
  return Buffer.from(s, "hex").toString("base64url");
}
export function base58btcToBase64url(s: string): string {
  return Buffer.from(base58btc.decode(s)).toString("base64url");
}
export function base64urlToBase58btc(s: string): string {
  return base58btc.encode(Buffer.from(s, "base64url"));
}
export function buffersToHex(...buffers: Buffer[]): string {
  return Buffer.concat(buffers).toString("hex");
}
