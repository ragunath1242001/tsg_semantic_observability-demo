import {
  defaultContext,
  dspContext,
  healthContext,
  tsgContext
} from "./context.defaults.js";
import { compact } from "./jsonld.js";

function extractPrefixes(
  context: Record<string, unknown>
): Map<string, string> {
  const prefixes = new Map<string, string>();
  for (const [key, value] of Object.entries(context)) {
    if (key.startsWith("@")) continue;
    if (typeof value === "string" && /[#/:]$/.test(value)) {
      prefixes.set(key, value);
    }
  }
  return prefixes;
}

export function getKnownPrefixes(): Map<string, string> {
  const combined = new Map<string, string>();
  for (const ctx of [dspContext, tsgContext, healthContext]) {
    const contextObj = (ctx as Record<string, unknown>)["@context"];
    if (contextObj && typeof contextObj === "object") {
      for (const [k, v] of extractPrefixes(
        contextObj as Record<string, unknown>
      )) {
        combined.set(k, v);
      }
    }
  }
  return combined;
}

function getPrefixFromKey(key: string): string | null {
  const colonIdx = key.indexOf(":");
  if (colonIdx <= 0) return null;
  // Skip full IRIs (http:// https://)
  if (key.startsWith("http://") || key.startsWith("https://")) return null;
  return key.substring(0, colonIdx);
}

export class ExtraPropsValidationError extends Error {
  public readonly unknownKeys: string[];
  constructor(unknownKeys: string[]) {
    super(
      `Unresolvable keys in extraProps: ${unknownKeys.join(", ")}. ` +
        `These keys could not be resolved to IRIs using the JSON-LD contexts ` +
        `and will be lost during compaction.`
    );
    this.unknownKeys = unknownKeys;
    this.name = "ExtraPropsValidationError";
  }
}

function collectDroppedKeys(
  original: Record<string, unknown>,
  compacted: Record<string, unknown>,
  path: string,
  result: string[]
): void {
  for (const key of Object.keys(original)) {
    if (key.startsWith("@")) continue;

    const keyPath = path ? `${path}.${key}` : key;
    const prefix = getPrefixFromKey(key);
    const localName = prefix ? key.substring(prefix.length + 1) : key;

    // Check if the key survived compaction in any equivalent form
    const matchingCompactedKey = Object.keys(compacted).find(
      (k) =>
        k === key ||
        k === localName ||
        (getPrefixFromKey(k) !== null &&
          k.substring(k.indexOf(":") + 1) === localName &&
          prefix !== null)
    );

    if (!matchingCompactedKey) {
      result.push(keyPath);
      continue;
    }

    // Recurse into nested objects
    const origVal = original[key];
    const compVal = compacted[matchingCompactedKey];
    if (
      origVal !== null &&
      typeof origVal === "object" &&
      !Array.isArray(origVal) &&
      compVal !== null &&
      typeof compVal === "object" &&
      !Array.isArray(compVal)
    ) {
      collectDroppedKeys(
        origVal as Record<string, unknown>,
        compVal as Record<string, unknown>,
        keyPath,
        result
      );
    }
  }
}

function collectUnknownPrefixes(
  obj: Record<string, unknown>,
  knownPrefixes: Map<string, string>,
  path: string,
  result: string[]
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@")) continue;
    const keyPath = path ? `${path}.${key}` : key;
    const prefix = getPrefixFromKey(key);
    if (prefix !== null && !knownPrefixes.has(prefix)) {
      result.push(keyPath);
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      collectUnknownPrefixes(
        value as Record<string, unknown>,
        knownPrefixes,
        keyPath,
        result
      );
    }
  }
}

export interface ValidateExtraPropsOptions {
  /** Whether to perform a compaction round-trip to detect dropped keys. Defaults to false. */
  compaction?: boolean;
}

/**
 * Validates that all prefixed keys in extraProps use known namespace prefixes from the JSON-LD contexts.
 * When compaction is enabled, also performs a round-trip compaction to detect any keys that would be dropped because they can't be resolved to IRIs.
 */
export async function validateExtraProps(
  extraProps: Record<string, unknown>,
  options: ValidateExtraPropsOptions = {}
): Promise<void> {
  const { compaction = false } = options;

  const knownPrefixes = getKnownPrefixes();
  const unknownPrefixes: string[] = [];
  collectUnknownPrefixes(extraProps, knownPrefixes, "", unknownPrefixes);

  if (unknownPrefixes.length > 0) {
    throw new ExtraPropsValidationError([...new Set(unknownPrefixes)]);
  }

  if (!compaction) return;

  // Round-trip to detect dropped non-prefixed keys
  const testDocument = {
    "@context": defaultContext(),
    "@type": "dcat:Dataset",
    "@id": "urn:validation:test",
    ...extraProps
  };

  const compacted = await compact(testDocument);

  const droppedKeys: string[] = [];
  collectDroppedKeys(extraProps, compacted, "", droppedKeys);

  if (droppedKeys.length > 0) {
    throw new ExtraPropsValidationError([...new Set(droppedKeys)]);
  }
}
