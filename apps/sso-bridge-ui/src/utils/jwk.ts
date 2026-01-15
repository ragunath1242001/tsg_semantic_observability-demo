/**
 * JWK (JSON Web Key) utility functions for key generation and management
 */

export type KeyType = "RSA" | "EC";
export type ECCurve = "P-256" | "P-384" | "P-521";
export type RSAKeySize = 2048 | 4096;

export interface JWKGenerationOptions {
  keyType: KeyType;
  ecCurve?: ECCurve;
  rsaKeySize?: RSAKeySize;
}

export interface JWKGenerationResult {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export type JWK = JsonWebKey & { kid?: string };

/**
 * Generate a JWK key pair in the browser using the Web Crypto API
 */
export async function generateJwkKeyPair(
  options: JWKGenerationOptions
): Promise<JWKGenerationResult> {
  let algorithm: globalThis.RsaHashedKeyGenParams | globalThis.EcKeyGenParams;
  let jwkAlgorithm: string;

  if (options.keyType === "RSA") {
    algorithm = {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: options.rsaKeySize || 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    };
    jwkAlgorithm = "RS256";
  } else {
    const curve = options.ecCurve || "P-256";
    algorithm = {
      name: "ECDSA",
      namedCurve: curve
    };
    jwkAlgorithm =
      curve === "P-256" ? "ES256" : curve === "P-384" ? "ES384" : "ES512";
  }

  const keyPair = await crypto.subtle.generateKey(algorithm, true, [
    "sign",
    "verify"
  ]);

  // Export public and private keys as JWK
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  // Generate a random key ID
  const kid = crypto.randomUUID();

  // Add metadata to the keys
  const publicKeyWithMeta: JWK = {
    ...publicJwk,
    kid,
    alg: jwkAlgorithm,
    use: "sig",
    ext: undefined,
    key_ops: undefined
  };

  const privateKeyWithMeta: JWK = {
    ...privateJwk,
    kid,
    alg: jwkAlgorithm,
    use: "sig",
    ext: undefined,
    key_ops: undefined
  };

  return {
    publicKey: publicKeyWithMeta,
    privateKey: privateKeyWithMeta
  };
}

/**
 * Parse a JWK from a JSON string
 */
export function parseJwkFromString(jwkString: string): JsonWebKey | null {
  if (!jwkString.trim()) {
    return null;
  }
  try {
    return JSON.parse(jwkString);
  } catch {
    throw new Error("Invalid JWK JSON format");
  }
}

/**
 * Stringify a JWK object to formatted JSON
 */
export function stringifyJwk(jwk: JsonWebKey | null | undefined): string {
  if (!jwk) {
    return "";
  }
  return JSON.stringify(jwk, null, 2);
}
