import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { generateKeyPairSync, randomUUID } from "crypto";
import fs from "fs";
import { exportJWK, JWK } from "jose";
import path from "path";

import { log } from "./utils.js";

/**
 * Supported key algorithms for client authentication
 */
export type KeyAlgorithm =
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512";

interface KeyGenerationOptions {
  algorithm: KeyAlgorithm;
  output?: string;
  keyId?: string;
  yes?: boolean;
}

interface GeneratedKeyPair {
  privateKey: JWK;
  publicKey: JWK;
  algorithm: KeyAlgorithm;
  keyId: string;
}

/**
 * Generate a new key pair for client authentication using private_key_jwt.
 */
export async function generateKeyPair(
  options: KeyGenerationOptions
): Promise<GeneratedKeyPair> {
  const { algorithm } = options;
  const keyId = options.keyId || randomUUID();

  let keypair;

  if (algorithm.startsWith("RS")) {
    // RSA key
    const modulusLength = getModulusLength(algorithm);
    keypair = generateKeyPairSync("rsa", { modulusLength });
  } else if (algorithm.startsWith("ES")) {
    // ECDSA key
    const namedCurve = getNamedCurve(algorithm);
    keypair = generateKeyPairSync("ec", { namedCurve });
  } else {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const privateJwk = await exportJWK(keypair.privateKey);
  const publicJwk = await exportJWK(keypair.publicKey);

  // Add key metadata
  privateJwk.kid = keyId;
  privateJwk.alg = algorithm;
  privateJwk.use = "sig";

  publicJwk.kid = keyId;
  publicJwk.alg = algorithm;
  publicJwk.use = "sig";

  return {
    privateKey: privateJwk,
    publicKey: publicJwk,
    algorithm,
    keyId
  };
}

/**
 * Interactive command to generate client keys
 */
export async function interactiveGenerateKeys(options: {
  output?: string;
  yes?: boolean;
  algorithm?: string;
  keyId?: string;
}): Promise<void> {
  const validAlgorithms: KeyAlgorithm[] = [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512"
  ];
  if (
    options.algorithm &&
    !validAlgorithms.includes(options.algorithm as KeyAlgorithm)
  ) {
    throw new Error(
      `Invalid algorithm: ${options.algorithm}. Must be one of: ${validAlgorithms.join(", ")}`
    );
  }

  const algorithm =
    (options.algorithm as KeyAlgorithm) ||
    (await select<KeyAlgorithm>({
      message: "Select key algorithm:",
      choices: [
        {
          name: "RS256 (RSA with SHA-256)",
          value: "RS256",
          description: "Widely supported, good for most use cases"
        },
        {
          name: "RS384 (RSA with SHA-384)",
          value: "RS384",
          description: "Higher security RSA variant"
        },
        {
          name: "RS512 (RSA with SHA-512)",
          value: "RS512",
          description: "Highest security RSA variant"
        },
        {
          name: "ES256 (ECDSA with P-256)",
          value: "ES256",
          description: "Compact keys, efficient, recommended for new projects"
        },
        {
          name: "ES384 (ECDSA with P-384)",
          value: "ES384",
          description: "Higher security ECDSA variant"
        },
        {
          name: "ES512 (ECDSA with P-521)",
          value: "ES512",
          description: "Highest security ECDSA variant"
        }
      ],
      default: "ES256"
    }));

  const keyId =
    options.keyId ||
    (options.algorithm
      ? randomUUID()
      : await input({
          message: "Enter key ID (kid) [leave empty for auto-generated]:",
          default: randomUUID()
        }));

  log("log", `\nGenerating ${algorithm} key pair...`);

  const keyPair = await generateKeyPair({
    algorithm,
    keyId
  });

  const outputDir = options.output || process.cwd();
  const privateKeyPath = path.join(outputDir, `private.jwk.json`);
  const publicKeyPath = path.join(outputDir, `public.jwk.json`);

  const existingFiles = [privateKeyPath, publicKeyPath].filter((f) =>
    fs.existsSync(f)
  );

  if (existingFiles.length > 0 && !options.yes) {
    log("warn", `The following files will be overwritten:`);
    existingFiles.forEach((f) => log("warn", `  - ${f}`));
    const proceed = await confirm({
      message: "Continue?",
      default: false
    });
    if (!proceed) {
      log("log", "Aborted.");
      return;
    }
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(privateKeyPath, JSON.stringify(keyPair.privateKey, null, 2));
  log("log", chalk.green(`✓ Private key saved to: ${privateKeyPath}`));
  log(
    "warn",
    chalk.yellow(
      "  ⚠️  Keep this file SECRET! Do not commit to version control."
    )
  );

  fs.writeFileSync(publicKeyPath, JSON.stringify(keyPair.publicKey, null, 2));
  log("log", chalk.green(`✓ Public key saved to: ${publicKeyPath}`));

  log("log", "\n" + chalk.bold("=== Summary ==="));
  log("log", `Key ID (kid): ${keyPair.keyId}`);
  log("log", `Algorithm: ${algorithm}`);
  log("log", "\n" + chalk.bold("=== Next Steps ==="));
  log(
    "log",
    `1. Register the public key with your SSO Bridge (via UI or configuration)`
  );
  log(
    "log",
    `2. Configure your application to use the private key for authentication`
  );
}

function getModulusLength(algorithm: KeyAlgorithm): number {
  switch (algorithm) {
    case "RS256":
      return 2048;
    case "RS384":
      return 3072;
    case "RS512":
      return 4096;
    default:
      return 2048;
  }
}

function getNamedCurve(algorithm: KeyAlgorithm): string {
  switch (algorithm) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      return "P-256";
  }
}
