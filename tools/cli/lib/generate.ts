import { confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import { createTwoFilesPatch } from "diff";
import { Eta } from "eta";
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { parse, stringify } from "yaml";

import {
  Applications,
  DataPlane,
  Ecosystem,
  General,
  Participant,
  ParticipantOverrides,
  SingleParticipant
} from "./model.js";
import { log, validateAndCreate } from "./utils.js";
import { getCliVersion } from "./validate.js";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

interface Options {
  file?: string;
  output: string;
  stdout: boolean;
  yes: boolean;
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
    this.pendingWrites = new Map();
    this.scope = "ecosystem";
    this.statePath = this.getStatePath(options.file, "ecosystem.yaml");
    // Process participants sequentially without awaiting inside the loop
    await participants.reduce(
      (p, participant) =>
        p.then(() => this.writeParticipant(participant, options)),
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
    this.pendingWrites = new Map();
    this.scope = "participant";
    this.statePath = this.getStatePath(options.file, "participant.yaml");
    await this.writeParticipant(participant, options);
    await this.finalizeWrites(options);
  };

  private writeParticipant = async (
    participant: Participant,
    options: Options
  ) => {
    log("log", `Creating configuration for participant ${participant.name}`);
    await this.writeConfig(
      "sso-bridge",
      `${options.output}/${participant.id}/values.sso-bridge.yaml`,
      { participant },
      !options.stdout
    );
    await this.writeConfig(
      "postgres",
      `${options.output}/${participant.id}/values.postgres.yaml`,
      { participant },
      !options.stdout
    );
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
      applications: this.applications
    });

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

    const yaml = stringify(obj);
    if (writeFile) {
      // Collect planned writes for finalize phase
      this.pendingWrites.set(outfile, yaml);
    } else {
      process.stdout.write(`### ${outfile}\n\n${yaml}\n\n`);
    }
  };

  private colorizeDiff(diff: string): string {
    return diff
      .split("\n")
      .map((line: string) => {
        if (line.startsWith("+++") || line.startsWith("---")) {
          return chalk.bold(line);
        }
        if (line.startsWith("@@")) {
          return chalk.cyan(line);
        }
        if (line.startsWith("+") && !line.startsWith("+++")) {
          return chalk.green(line);
        }
        if (line.startsWith("-") && !line.startsWith("---")) {
          return chalk.red(line);
        }
        return line;
      })
      .join("\n");
  }
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
        process.stdout.write(`\n${this.colorizeDiff(patch)}\n`);
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
