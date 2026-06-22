const DEFAULT_HASH_PREFIX_LENGTH = 16;
const SENSITIVE_ATTRIBUTE_KEYS =
  /(?:secret|token|credential|password|authorization|cookie|payload|content|body|raw|message|error)/i;

export function normalizeSemanticReference(
  reference: string | null | undefined
): string | undefined {
  const value = reference?.trim();
  if (!value) {
    return undefined;
  }

  return value.replace(/#.*$/, "");
}

export function extractVersionFromReference(
  reference: string | null | undefined
): string | undefined {
  const value = reference?.trim();
  if (!value) {
    return undefined;
  }

  const versionMatch = value.match(
    /(?:^|[/@:_-])v?(\d+\.\d+(?:\.\d+)?)(?:$|[/#?_-])/i
  );
  return versionMatch?.[1];
}

export function pseudonymizeIdentifier(
  value: string | null | undefined,
  salt = ""
): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return `p_${stableHash(`${salt}:${normalized}`).slice(
    0,
    DEFAULT_HASH_PREFIX_LENGTH
  )}`;
}

export function pseudonymizeSemanticReference(
  reference: string | null | undefined,
  salt = "semantic-reference"
): string | undefined {
  return pseudonymizeIdentifier(normalizeSemanticReference(reference), salt);
}

export function sanitizeAttributes(
  attributes: Record<string, unknown>,
  allowedKeys?: string[],
  redactSensitiveText = true
): Record<string, string | number | boolean | null> {
  const allowedKeySet = allowedKeys ? new Set(allowedKeys) : undefined;

  return Object.entries(attributes).reduce<
    Record<string, string | number | boolean | null>
  >((sanitized, [key, value]) => {
    if (allowedKeySet && !allowedKeySet.has(key)) {
      return sanitized;
    }

    if (redactSensitiveText && SENSITIVE_ATTRIBUTE_KEYS.test(key)) {
      if (value !== undefined) {
        sanitized[key] = "[redacted]";
      }
      return sanitized;
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }

    return sanitized;
  }, {});
}

export function sanitizeFreeText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return "[redacted]";
}

function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, "0");
}
