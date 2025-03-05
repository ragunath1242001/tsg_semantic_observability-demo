import { base32 } from "multiformats/bases/base32";
import { canonicalize } from "json-canonicalize";
import { createHash } from "node:crypto";

export const clone = (input: any) => JSON.parse(JSON.stringify(input));

export const createSCID = async (logEntryHash: string): Promise<string> => {
  return `${logEntryHash.slice(0, 28)}`;
};

export const deriveHash = (input: any): string => {
  const data = canonicalize(input);
  const hash = createHash("sha256").update(data).digest();
  return base32.encode(hash);
};
