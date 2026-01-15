import { confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import { createTwoFilesPatch } from "diff";
import { Eta } from "eta";
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { parse, stringify } from "yaml";

import { generateKeyPair } from "./keys.js";
import {
  Applications,
  DataPlane,
  Ecosystem,
  General,
  Participant,
  ParticipantOverrides,
  SingleParticipant
} from "./model.js";
import {
  colorizeDiff,
  escapeYamlYKeys,
  execPromise,
  log,
  validateAndCreate
} from "./utils.js";
import { getCliVersion } from "./validate.js";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

interface Options {
  file?: string;
  output: string;
  stdout: boolean;
  yes: boolean;
  cwd?: string;
}

// New state model written next to the input YAML (ecosystem/participant)
interface BootstrapStateSection {
  files: string[]; // paths relative to output dir
  scope: "ecosystem" | "participant";
  updatedAt: string;
  cliVersion: string;
}

interface DeployStateSection {
  namespace: string;
  participants: Record<string, { releases: string[] }>;
  updatedAt: string;
  cliVersion: string;
}

interface TsgState {
  bootstrap?: BootstrapStateSection;
  deploy?: DeployStateSection;
}

export class Generate {
  eta!: Eta;
  constructor() {
    if (fs.existsSync(__dirname + "/../../templates")) {
      this.eta = new Eta({
        views: __dirname + "/../../templates",
        autoTrim: false,
        autoEscape: false
      });
    } else if (fs.existsSync(__dirname + "/../templates")) {
      this.eta = new Eta({
        views: __dirname + "/../templates",
        autoTrim: false,
        autoEscape: false
      });
    }
    this.pendingWrites = new Map();
  }

  general!: General;
  participants!: Participant[];
  applications?: Applications;
  yes?: boolean;
  cwd?: string;
  updateSecrets?: boolean = undefined;
  private pendingWrites!: Map<string, string>;
  private statePath?: string;
  private scope!: "ecosystem" | "participant";

  writeEcosystem = async (options: Options) => {
    log("log", "Creating configuration for an ecosytem");
    const yaml = fs.readFileSync(options.file ?? "ecosystem.yaml");
    const json = parse(yaml.toString());
    const { general, applications, participants } = await validateAndCreate(
      Ecosystem,
      json
    );
    participants.forEach((participant) => participant.generateTestService());
    this.general = general;
    this.applications = applications;
    this.participants = participants;
    this.yes = options.yes;
    this.cwd = options.cwd;
    this.pendingWrites = new Map();
    this.scope = "ecosystem";
    this.statePath = this.getStatePath(options.file, "ecosystem.yaml");
    this.updateSecrets =
      this.general.oauthClientAuthMethod === "private_key_jwt"
        ? await confirm({
            message: `Do you want to create/update Kubernetes secrets for OAuth private keys?\n  (If you choose 'no', existing secrets will be reused if found, but new keys won't be generated)`,
            default: true
          })
        : false;
    if (general.postgresDeploymentMode === "per-namespace") {
      await this.writeConfig(
        "postgres",
        `${options.output}/postgres.yaml`,
        { participants: this.participants },
        !options.stdout
      );
    }
    // Process participants sequentially without awaiting inside the loop
    await participants.reduce(
      (p, participant) =>
        p.then(() =>
          this.writeParticipant(
            participant,
            options,
            general.postgresDeploymentMode === "per-participant"
          )
        ),
      Promise.resolve()
    );
    await this.finalizeWrites(options);
  };

  writeSingleParticipant = async (options: Options) => {
    const yaml = fs.readFileSync(options.file ?? "participant.yaml");
    const json = parse(yaml.toString());
    const { general, applications, participant } = await validateAndCreate(
      SingleParticipant,
      json
    );
    participant.generateTestService();

    this.general = general;
    this.applications = applications;
    this.participants = [];
    this.yes = options.yes;
    this.cwd = options.cwd;
    this.pendingWrites = new Map();
    this.scope = "participant";
    this.statePath = this.getStatePath(options.file, "participant.yaml");
    this.updateSecrets =
      this.general.oauthClientAuthMethod === "private_key_jwt"
        ? await confirm({
            message: `Do you want to create/update Kubernetes secrets for OAuth private keys?\n  (If you choose 'no', existing secrets will be reused if found, but new keys won't be generated)`,
            default: true
          })
        : false;
    await this.writeParticipant(participant, options, true);
    await this.finalizeWrites(options);
  };

  private writeParticipant = async (
    participant: Participant,
    options: Options,
    database: boolean
  ) => {
    log("log", `Creating configuration for participant ${participant.name}`);

    // Generate OAuth keys if using private_key_jwt
    const oauthPublicKeys: Record<string, any> = {};
    if (this.general.oauthClientAuthMethod === "private_key_jwt") {
      log(
        "log",
        chalk.cyan(
          "Configuring OAuth private keys for private_key_jwt authentication..."
        )
      );

      const clientIds = ["wallet"];
      if (participant.hasControlPlane) {
        clientIds.push("control-plane");
      }
      participant.dataPlanes.forEach((_dp, id) => clientIds.push(id));

      for (const clientId of clientIds) {
        const secretName = `sso-${participant.id}-${clientId}-secret`;

        // Check if secret already exists
        const checkCommand = `kubectl get secret ${secretName} -n ${this.general.namespace} --ignore-not-found=true -o jsonpath='{.data.private-key\\.jwk}'`;

        let publicKey;
        let existingSecret = false;

        try {
          const [result] = await execPromise(
            checkCommand,
            false,
            this.cwd,
            false,
            undefined,
            false
          );

          if (result && result.trim()) {
            // Secret exists, extract public key from it
            existingSecret = true;
            try {
              const privateKeyJson = Buffer.from(
                result.trim(),
                "base64"
              ).toString("utf8");
              const privateKey = JSON.parse(privateKeyJson);

              // Derive public key by removing private components from JWK
              // For RSA: remove d, p, q, dp, dq, qi
              // For EC: remove d
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { d, p, q, dp, dq, qi, ...publicKeyOnly } = privateKey;
              publicKey = publicKeyOnly;

              log(
                "log",
                `  ✓ Reusing existing key pair for ${participant.name} ${clientId} (kid: ${publicKey.kid || "none"})`
              );
            } catch (e) {
              log(
                "warn",
                `  Failed to extract public key from secret ${secretName}, ${this.updateSecrets ? "will generate new key" : "no key will be configured"}: ${e}`
              );
              existingSecret = false;
            }
          }
        } catch (_e) {
          // Secret doesn't exist or error checking, will create new one
        }

        // If secret doesn't exist or we couldn't extract the key, generate new one
        if (!existingSecret) {
          if (!this.updateSecrets) {
            log(
              "warn",
              `  Skipping key generation for ${participant.name} ${clientId} as no existing secret found and no new secrets are to be created.`
            );
          } else {
            const keyPair = await generateKeyPair({
              algorithm: this.general.oauthPrivateKeyAlgorithm || "ES256"
            });
            publicKey = keyPair.publicKey;

            log(
              "log",
              `  ✓ Generated ${keyPair.algorithm} key pair for ${clientId} (kid: ${keyPair.keyId})`
            );

            // Store private key in Kubernetes secret
            const privateKeyJson = JSON.stringify(keyPair.privateKey);
            const createCommand = `kubectl create secret generic ${secretName} -n ${this.general.namespace} --from-literal=clientId='${clientId}'  --from-literal=private-key.jwk='${privateKeyJson.replace(/'/g, "\\'")}' --dry-run=client -o yaml | kubectl apply -f -`;

            try {
              await execPromise(
                createCommand,
                false,
                this.cwd,
                false,
                undefined,
                false
              );
              log("log", `  ✓ Stored private key in secret: ${secretName}`);
            } catch (e) {
              log("warn", `  Failed to create secret ${secretName}: ${e}`);
            }
          }
        }

        oauthPublicKeys[clientId] = publicKey;
      }
    }

    await this.writeConfig(
      "sso-bridge",
      `${options.output}/${participant.id}/values.sso-bridge.yaml`,
      { participant, oauthPublicKeys },
      !options.stdout
    );

    if (database) {
      await this.writeConfig(
        "postgres",
        `${options.output}/${participant.id}/postgres.yaml`,
        { participant, participants: [participant] },
        !options.stdout
      );
    }

    await this.writeConfig(
      "wallet",
      `${options.output}/${participant.id}/values.wallet.yaml`,
      {
        participant
      },
      !options.stdout
    );
    if (participant.hasControlPlane) {
      await this.writeConfig(
        "control-plane",
        `${options.output}/${participant.id}/values.control-plane.yaml`,
        {
          participant
        },
        !options.stdout
      );
    }
    // Run sequentially to keep prompts readable
    let dpChain = Promise.resolve();
    participant.dataPlanes.forEach((dataPlane: DataPlane, id: string) => {
      dpChain = dpChain.then(() =>
        this.writeConfig(
          "data-plane",
          `${options.output}/${participant.id}/values.${id}.yaml`,
          {
            participant,
            dataPlane,
            id,
            config: (indent: number): string => {
              if (dataPlane.config) {
                return stringify(dataPlane.config).replace(
                  /^/gm,
                  " ".repeat(indent)
                );
              } else {
                return "";
              }
            }
          },
          !options.stdout
        )
      );
    });
    await dpChain;
  };

  private writeConfig = async (
    templateFile: string,
    outfile: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any,
    writeFile: boolean
  ) => {
    const rendered = this.eta.render(`./${templateFile}.yaml.eta`, {
      general: this.general,
      ...config,
      // participant: participant,
      participants: this.participants,
      applications: this.applications,
      scope: this.scope
    });

    // Special handling for templates that contain multiple YAML documents (CRDs)
    // These should be written as-is without parsing/merging
    // Also skip parsing for sso-bridge to preserve JWK inline JSON format
    if (templateFile === "postgres") {
      if (writeFile) {
        this.pendingWrites.set(outfile, rendered);
      } else {
        process.stdout.write(`### ${outfile}\n\n${rendered}\n\n`);
      }
      return;
    }

    // parse template and optionally merge overrides
    let obj = parse(rendered);
    const participant = config?.participant as Participant | undefined;
    const inlineConfig = this.inlineOverride(
      "config",
      participant,
      templateFile,
      config?.dataPlane
    );
    if (inlineConfig) {
      if (obj.config) {
        obj.config = deepMerge(obj.config, inlineConfig);
      } else {
        obj.config = inlineConfig;
      }
    }
    const overridesInline = this.inlineOverride(
      "overrides",
      participant,
      templateFile,
      config?.dataPlane
    );
    if (overridesInline) obj = deepMerge(obj, overridesInline);

    const yaml = escapeYamlYKeys(stringify(obj));

    if (writeFile) {
      // Collect planned writes for finalize phase
      this.pendingWrites.set(outfile, yaml);
    } else {
      process.stdout.write(`### ${outfile}\n\n${yaml}\n\n`);
    }
  };

  private async finalizeWrites(options: Options) {
    if (options.stdout) {
      return; // nothing to write when outputting to stdout
    }
    const outDir = options.output;
    const plannedFiles = Array.from(this.pendingWrites.keys());
    if (plannedFiles.length === 0) return;

    // ensure base dir exists for comparisons
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const existingFiles = this.listFilesRecursive(outDir);
    const plannedSet = new Set(plannedFiles.map((p) => path.resolve(p)));
    const existingSet = new Set(existingFiles.map((p) => path.resolve(p)));
    // Read existing state (to only remove files that were created by CLI previously)
    const priorState = this.readStateSafe();
    const priorBootstrapFilesAbs = (priorState?.bootstrap?.files ?? []).map(
      (rel) => path.resolve(outDir, rel)
    );
    // Candidate files we may remove during clean-diff = previously generated but not planned now
    const toRemoveKnown = priorBootstrapFilesAbs.filter(
      (f) => !plannedSet.has(path.resolve(f)) && fs.existsSync(f)
    );

    // Prepare diffs for planned files (both existing and new)
    const diffs: Array<{ file: string; patch: string }> = [];
    for (const file of plannedFiles) {
      const next = this.pendingWrites.get(file)!;
      const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (prev === next) continue; // no change
      const patch = createTwoFilesPatch(file, "generated", prev, next, "", "", {
        context: 3
      });
      diffs.push({ file, patch });
    }

    if (diffs.length === 0 && toRemoveKnown.length === 0) {
      await this.updateBootstrapState(outDir, plannedFiles);
      log("log", "No changes detected in planned files.");
      return;
    }

    // If there are no existing files at all, just write without prompt
    const hasAnyExisting = existingSet.size > 0;
    if (!hasAnyExisting) {
      await this.updateBootstrapState(outDir, plannedFiles);
      await this.applyWrites(plannedFiles);
      return;
    }

    // Prompt for action
    const choice = this.yes
      ? "clean-diff"
      : await select({
          message: "Existing files found. Choose an action:",
          choices: [
            {
              name: "Clean & diff",
              value: "clean-diff",
              description:
                "Show diffs, remove files previously created by CLI that are not needed anymore"
            },
            {
              name: "Move",
              value: "move",
              description: `Move existing output directory to "${outDir}.old"`
            },
            {
              name: "Abort",
              value: "abort",
              description: "Abort the operation"
            }
          ]
        });

    if (choice === "abort") {
      process.exit(0);
    }

    if (choice === "move") {
      if (fs.existsSync(`${outDir}.old`)) {
        const overwrite = this.yes
          ? true
          : await confirm({
              message: `Folder ${outDir}.old already exists, overwrite?`
            });
        if (!overwrite) process.exit(0);
        fs.rmSync(`${outDir}.old`, { recursive: true, force: true });
      }
      fs.renameSync(outDir, `${outDir}.old`);
      fs.mkdirSync(outDir, { recursive: true });
      await this.applyWrites(plannedFiles);
      return;
    }

    // Show diffs (for continue-diff / clean-diff)
    if (diffs.length > 0) {
      process.stdout.write(
        `\n--- Preview of changes (${diffs.length} file(s)) ---\n`
      );
      for (const { patch } of diffs) {
        process.stdout.write(`\n${colorizeDiff(patch)}\n`);
      }
      if (toRemoveKnown.length > 0) {
        process.stdout.write(
          chalk.bold(
            `\n--- Preview of CLI-created files to be removed (${toRemoveKnown.length} file(s)) ---\n`
          )
        );
        for (const f of toRemoveKnown) {
          process.stdout.write(chalk.bold(chalk.red(`\n- ${f}\n`)));
        }
      }
      const proceed = this.yes
        ? true
        : await confirm({
            message: "Do you want to proceed with these changes?",
            default: true
          });
      if (!proceed) process.exit(0);
    } else {
      log("log", "No changes detected in planned files.");
    }

    // For clean-diff, remove only previously CLI-created files that are no longer planned
    if (toRemoveKnown.length > 0) {
      for (const f of toRemoveKnown) {
        try {
          fs.rmSync(f, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    }

    await this.applyWrites(plannedFiles);

    // Write/update bootstrap state file
    await this.updateBootstrapState(outDir, plannedFiles);
  }

  private async applyWrites(files: string[]) {
    for (const file of files) {
      const content = this.pendingWrites.get(file)!;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
  }

  private listFilesRecursive(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...this.listFilesRecursive(full));
      } else if (e.isFile()) {
        out.push(full);
      }
    }
    return out;
  }

  private getStatePath(configFile: string | undefined, defaultFile: string) {
    const file = configFile ?? defaultFile;
    const dir = path.dirname(path.resolve(file));
    const base = path.basename(file, path.extname(file));
    return path.join(dir, `${base}.tsg-state.json`);
  }

  private readStateSafe(): TsgState | undefined {
    try {
      if (!this.statePath) return undefined;
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, "utf8");
        return JSON.parse(content) as TsgState;
      }
    } catch (e) {
      log("warn", `Failed to read state at ${this.statePath}: ${e}`);
    }
    return undefined;
  }

  private async updateBootstrapState(
    outDir: string,
    plannedFilesAbs: string[]
  ) {
    if (!this.statePath) return;
    // store files relative to outDir for portability
    const filesRel = plannedFilesAbs.map((f) => path.relative(outDir, f));
    const cliVersion = await getCliVersion();
    const now = new Date().toISOString();

    const current = this.readStateSafe() ?? {};
    const next: TsgState = {
      ...current,
      bootstrap: {
        files: filesRel,
        scope: this.scope,
        updatedAt: now,
        cliVersion
      }
    };
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(next, null, 2));
      log("log", `Wrote bootstrap state to ${this.statePath}`);
    } catch (e) {
      log("warn", `Failed to write state to ${this.statePath}: ${e}`);
    }
  }
  private inlineOverride(
    type: "config" | "overrides",
    participant: Participant | undefined,
    templateFile: string,
    dataPlane?: DataPlane
  ): unknown | undefined {
    if (templateFile === "data-plane") {
      return dataPlane?.[type];
    }
    const o = participant?.[type];
    if (!o) return undefined;
    switch (templateFile) {
      case "postgres":
        return o instanceof ParticipantOverrides ? o.postgres : undefined;
      case "sso-bridge":
        return o.ssoBridge;
      case "wallet":
        return o.wallet;
      case "control-plane":
        return o.controlPlane;
      default:
        return undefined;
    }
  }
}

// Simple deep merge: merges objects; arrays are replaced by source
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) || Array.isArray(source)) {
    if (source[0] === "merge-array") {
      return [...target, ...source.slice(1)];
    } else {
      return source ?? target;
    }
  }
  if (isObject(target) && isObject(source)) {
    const out: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (key in target) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (out as any)[key] = deepMerge((target as any)[key], value);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (out as any)[key] = value;
      }
    }
    return out;
  }
  return source ?? target;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(item: any): item is Record<string, unknown> {
  return item && typeof item === "object" && !Array.isArray(item);
}
