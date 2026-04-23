#!/usr/bin/env tsx
/**
 * Generates fully typed API clients from the OpenAPI specs.
 *
 * Output goes to .generated/ (gitignored). Run this before building:
 *   pnpm generate
 *
 * The OpenAPI specs use paths starting with `/api/...` (the NestJS global prefix).
 * We strip this prefix so the SDK paths are server-agnostic — callers include
 * `/api` in the base URL when needed (e.g. `http://localhost:3501/api`).
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../");
const outDir = resolve(import.meta.dirname, "../.generated");
const tmpDir = resolve(outDir, ".tmp");

mkdirSync(tmpDir, { recursive: true });

const specs = [
  {
    name: "control-plane",
    spec: resolve(repoRoot, "website/docs/apps/control-plane/openapi.yaml")
  },
  {
    name: "wallet",
    spec: resolve(repoRoot, "website/docs/apps/wallet/openapi.yaml")
  },
  {
    name: "sso-bridge",
    spec: resolve(repoRoot, "website/docs/apps/sso-bridge/openapi.yaml")
  }
];

for (const { name, spec } of specs) {
  const outFile = resolve(outDir, `${name}.d.ts`);

  // Pre-process: strip /api prefix from paths in the OpenAPI spec
  const rawSpec = readFileSync(spec, "utf-8");
  const stripped = rawSpec.replace(/^( {2}| {4})\/api\//gm, "$1/");
  const tmpSpec = resolve(tmpDir, `${name}.yaml`);
  writeFileSync(tmpSpec, stripped);

  console.log(
    `Generating types for ${name} (paths stripped of /api prefix)...`
  );
  execSync(`npx openapi-typescript "${tmpSpec}" -o "${outFile}"`, {
    stdio: "inherit",
    cwd: resolve(import.meta.dirname, "..")
  });
}

console.log("\n✓ API types generated in .generated/ (without /api prefix)");
