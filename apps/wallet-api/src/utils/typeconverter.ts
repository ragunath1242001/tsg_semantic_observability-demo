import { base58btc } from "multiformats/bases/base58";

export function base64urlToHex(s: string): string {
  return Buffer.from(s, "base64url").toString("hex");
}
export function hexToBase58btc(s: string): string {
  return base58btc.encode(Buffer.from(s, "hex"));
}
