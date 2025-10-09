import { checkbox, confirm, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { parse } from "yaml";

import {
  Applications,
  Ecosystem,
  General,
  Participant,
  SingleParticipant
} from "./model.js";
import { execPromise, log, validateAndCreate } from "./utils.js";
import { getCliVersion, getLatestRelease } from "./validate.js";

interface Options {
  file?: string;
  uninstall: boolean;
  clean: boolean;
  cleanDatabase: boolean;
  diff: boolean;
  dryRun: boolean;
  cwd?: string;
  config: string;
  yes: boolean;
  timeout: string;
}

interface BootstrapStateSection {
  files: string[];
  outputDir: string;
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

export class Deploy {
  general!: General;
  applications?: Applications;
  cwd?: string;
  latestVersion!: string;
  currentCliVersion!: string;
  scope!: "ecosystem" | "participant";

  private getStatePath(configFile: string | undefined, defaultFile: string) {
    const file = configFile ?? defaultFile;
    const dir = path.dirname(path.resolve(file));
    const base = path.basename(file, path.extname(file));
    return path.join(dir, `${base}.tsg-state.json`);
  }

  private readState(statePath: string): TsgState {
    try {
      if (fs.existsSync(statePath)) {
        const content = fs.readFileSync(statePath, "utf8");
        const parsed = JSON.parse(content) as unknown;
        if (
          parsed &&
          typeof parsed === "object" &&
          "participants" in (parsed as Record<string, unknown>)
        ) {
          // legacy root-level deploy state
          const legacy = parsed as DeployStateSection;
          return { deploy: legacy } as TsgState;
        }
        return parsed as TsgState;
      }
    } catch (e) {
      log("warn", `Failed to read state at ${statePath}: ${e}`);
    }
    return {
      deploy: {
        namespace: this.general.namespace,
        participants: {},
        updatedAt: new Date().toISOString(),
        cliVersion: this.currentCliVersion
      }
    } as TsgState;
  }

  private writeState(statePath: string, state: TsgState) {
    try {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      log("log", `Wrote deploy state to ${statePath}`);
    } catch (e) {
      log("warn", `Failed to write state to ${statePath}: ${e}`);
    }
  }

  private participantReleases(p: Participant): string[] {
    const releases: string[] = [];
    releases.push(`${p.id}-tsg-sso-bridge`);
    releases.push(`${p.id}-tsg-wallet`);
    if (p.hasControlPlane) releases.push(`${p.id}-tsg-control-plane`);
    p.dataPlanes.forEach((_dp, id) => releases.push(`${p.id}-tsg-${id}`));
    return releases;
  }

  private async uninstallReleases(
    releases: string[],
    dryRun: boolean
  ): Promise<void> {
    for (const rel of releases) {
      // eslint-disable-next-line no-await-in-loop
      await execPromise(
        `helm delete -n ${this.general.namespace} ${rel}`,
        dryRun,
        this.cwd,
        false
      );
    }
  }

  private async pruneStale(
    state: TsgState,
    current: Record<string, string[]>,
    dryRun: boolean
  ) {
    const deploy = state.deploy;
    if (deploy?.namespace && deploy.namespace !== this.general.namespace) {
      log(
        "warn",
        `State namespace (${deploy?.namespace}) differs from current (${this.general.namespace}), skipping prune.`
      );
      return;
    }
    // Remove participants not present anymore
    const staleParticipants = Object.keys(deploy?.participants ?? {}).filter(
      (pid) => !(pid in current)
    );
    for (const pid of staleParticipants) {
      const releases = deploy?.participants[pid]?.releases ?? [];
      for (const rel of releases) {
        // eslint-disable-next-line no-await-in-loop
        await execPromise(
          `helm delete -n ${this.general.namespace} ${rel}`,
          dryRun,
          this.cwd,
          false
        );
      }
    }
    // Remove releases removed from existing participants
    for (const [pid, releases] of Object.entries(deploy?.participants ?? {})) {
      if (!(pid in current)) continue;
      const wanted = new Set(current[pid]);
      const staleReleases = (releases?.releases ?? []).filter(
        (r) => !wanted.has(r)
      );
      for (const rel of staleReleases) {
        // eslint-disable-next-line no-await-in-loop
        await execPromise(
          `helm delete -n ${this.general.namespace} ${rel}`,
          dryRun,
          this.cwd,
          false
        );
      }
    }
  }

  deployEcosystem = async (options: Options) => {
    const yaml = fs.readFileSync(options.file ?? "ecosystem.yaml");
    const json = parse(yaml.toString());
    const { general, applications, participants } = await validateAndCreate(
      Ecosystem,
      json
    );
    participants.forEach((participant) =>
      participant.generateTestService(false)
    );
    this.general = general;
    this.applications = applications;
    this.cwd = options.cwd;
    this.scope = "ecosystem";

    await this.confirmOptions(options);

    const statePath = this.getStatePath(options.file, "ecosystem.yaml");
    const state = this.readState(statePath);

    if (options.uninstall) {
      log("log", `Uninstalling ecosystem`);
      // Determine all releases to uninstall from state and current YAML (union)
      const allReleases = new Set<string>();
      // From state
      for (const p of Object.values(state.deploy?.participants ?? {})) {
        p.releases.forEach((r: string) => allReleases.add(r));
      }
      // From current YAML (covers cases where state is missing/incomplete)
      for (const participant of participants) {
        this.participantReleases(participant).forEach((r) =>
          allReleases.add(r)
        );
      }

      await this.uninstallReleases(Array.from(allReleases), options.dryRun);
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/sso-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
        options.dryRun,
        this.cwd
      );
      // Clear deploy state section but keep other sections
      this.writeState(statePath, {
        ...state,
        deploy: {
          namespace: this.general.namespace,
          participants: {},
          updatedAt: new Date().toISOString(),
          cliVersion: this.currentCliVersion
        }
      });
      return;
    }

    if (
      !fs.existsSync(options.config) ||
      fs.readdirSync(options.config).length === 0
    ) {
      log(
        "error",
        `Config directory (${options.config}) non-existing or empty!`
      );
    }

    if (options.clean) {
      log("log", `Cleaning ecosystem`);
      const promises = [];
      for (const participant of participants) {
        promises.push(
          this.uninstallParticipant(
            participant,
            options.dryRun,
            options.cleanDatabase
          )
        );
      }
      await Promise.all(promises);
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/sso-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
        options.dryRun,
        this.cwd
      );

      if (
        options.cleanDatabase &&
        this.general.postgresDeploymentMode === "per-namespace" &&
        !options.dryRun
      ) {
        const shouldDeleteCluster =
          options.yes ||
          (await confirm({
            message:
              "Would you like to delete the shared PostgreSQL cluster? This will remove the cluster and all data for ALL participants. And increases the deployment time when redeploying.",
            default: false
          }));

        if (shouldDeleteCluster) {
          log("log", "Deleting shared PostgreSQL cluster...");
          await execPromise(
            `kubectl delete cluster postgresql-cluster -n ${this.general.namespace} --ignore-not-found=true`,
            options.dryRun,
            this.cwd,
            false
          );
        } else {
          log(
            "log",
            "Shared PostgreSQL cluster preserved (only databases were deleted)"
          );
        }
      }
    }

    // Prune removed participants/services before installing
    const currentMap: Record<string, string[]> = {};
    for (const p of participants) {
      currentMap[p.id] = this.participantReleases(p);
    }
    await this.pruneStale(state, currentMap, options.dryRun);

    // Ensure CloudNativePG operator is installed
    await this.ensureCloudNativePGOperator(options.dryRun, options.yes);

    // Deploy shared postgres cluster for per-namespace mode
    if (this.general.postgresDeploymentMode === "per-namespace") {
      await this.installSharedPostgres(
        options.config,
        options.dryRun,
        options.yes,
        options.diff
      );
    }

    if (options.diff) {
      log("log", `Determining differences for ecosystem`);
      for (const participant of participants) {
        // eslint-disable-next-line no-await-in-loop
        await this.installParticipant(
          participant,
          options.config,
          true,
          false,
          options.yes,
          options.timeout
        );
      }
      if (options.yes || (await confirm({ message: "Execute upgrade?" }))) {
        log("log", `Deploying ecosystem`);
        for (const participant of participants) {
          // eslint-disable-next-line no-await-in-loop
          await this.installParticipant(
            participant,
            options.config,
            false,
            options.dryRun,
            options.yes,
            options.timeout
          );
        }
      }
    } else {
      log("log", `Deploying ecosystem`);
      for (const participant of participants) {
        // eslint-disable-next-line no-await-in-loop
        await this.installParticipant(
          participant,
          options.config,
          false,
          options.dryRun,
          options.yes,
          options.timeout
        );
      }
    }

    // Update state when not a dry run
    if (!options.dryRun) {
      const deploySection: DeployStateSection = {
        namespace: this.general.namespace,
        participants: {},
        updatedAt: new Date().toISOString(),
        cliVersion: this.currentCliVersion
      };
      for (const p of participants) {
        deploySection.participants[p.id] = {
          releases: this.participantReleases(p)
        };
      }
      this.writeState(statePath, { ...state, deploy: deploySection });
    }
  };
  deploySingleParticipant = async (options: Options) => {
    const yaml = fs.readFileSync(options.file ?? "participant.yaml");
    const json = parse(yaml.toString());
    const { general, applications, participant } = await validateAndCreate(
      SingleParticipant,
      json
    );
    participant.generateTestService(false);

    this.general = general;
    this.applications = applications;
    this.cwd = options.cwd;
    this.scope = "participant";

    await this.confirmOptions(options);

    const statePath = this.getStatePath(options.file, "participant.yaml");
    const state = this.readState(statePath);

    if (options.uninstall) {
      log("log", `Uninstalling participant`);
      // Gather releases from current YAML and from state for this participant
      const fromYaml = this.participantReleases(participant);
      const fromState =
        state.deploy?.participants[participant.id]?.releases ?? [];
      const releases = Array.from(new Set([...fromYaml, ...fromState]));
      await this.uninstallReleases(releases, options.dryRun);
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/sso-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
        options.dryRun,
        this.cwd
      );
      // Remove only this participant from state
      if (!options.dryRun) {
        const newState: TsgState = { ...state };
        const participantsMap: Record<string, { releases: string[] }> = {
          ...(state.deploy?.participants ?? {})
        };
        delete participantsMap[participant.id];
        newState.deploy = {
          namespace: this.general.namespace,
          participants: participantsMap,
          updatedAt: new Date().toISOString(),
          cliVersion: this.currentCliVersion
        };
        this.writeState(statePath, newState);
      }
      return;
    }

    if (
      !fs.existsSync(options.config) ||
      fs.readdirSync(options.config).length === 0
    ) {
      log(
        "error",
        `Config directory (${options.config}) non-existing or empty!`
      );
    }

    if (options.clean) {
      log("log", `Cleaning participant`);
      await this.uninstallParticipant(
        participant,
        options.dryRun,
        options.cleanDatabase
      );
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/sso-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
        options.dryRun,
        this.cwd
      );
    }
    // Prune removed services for this participant
    await this.pruneStale(
      state,
      { [participant.id]: this.participantReleases(participant) },
      options.dryRun
    );

    // Ensure CloudNativePG operator is installed
    await this.ensureCloudNativePGOperator(options.dryRun, options.yes);

    if (options.diff) {
      log("log", `Determining differences for participant`);
      await this.installParticipant(
        participant,
        options.config,
        true,
        false,
        options.yes,
        options.timeout
      );
      if (options.yes || (await confirm({ message: "Execute upgrade?" }))) {
        log("log", `Deploying participant`);
        await this.installParticipant(
          participant,
          options.config,
          false,
          options.dryRun,
          options.yes,
          options.timeout
        );
      }
    } else {
      log("log", `Deploying participant`);
      await this.installParticipant(
        participant,
        options.config,
        false,
        options.dryRun,
        options.yes,
        options.timeout
      );
    }

    if (!options.dryRun) {
      const newState: TsgState = { ...state };
      newState.deploy = {
        namespace: this.general.namespace,
        participants: {
          [participant.id]: { releases: this.participantReleases(participant) }
        },
        updatedAt: new Date().toISOString(),
        cliVersion: this.currentCliVersion
      };
      this.writeState(statePath, newState);
    }
  };

  private async confirmOptions(options: Options) {
    this.latestVersion = await getLatestRelease();
    this.currentCliVersion = await getCliVersion();

    if (!options.yes) {
      const currentContext: string = await execPromise(
        "kubectl config current-context",
        false,
        undefined,
        false,
        undefined,
        false
      );

      const answer: (
        | "context"
        | "uninstall"
        | "clean"
        | "cleanDatabase"
        | "diff"
        | "dryRun"
      )[] = await checkbox({
        message: "Confirm or update configuration",
        instructions: ` (Press ${chalk.blue(
          "<space>"
        )} to toggle options and ${chalk.blue("<enter>")} to confirm options)`,
        theme: {
          helpMode: "always"
        },
        choices: [
          {
            name: `use Kubernetes context ${currentContext.trim()} (will abort if not selected)`,
            value: "context",
            checked: true
          },
          {
            name: "uninstall all resources, without redeployment (will override clean and clean database)",
            value: "uninstall",
            checked: options.uninstall
          },
          {
            name: "clean existing Helm releases",
            value: "clean",
            checked: options.clean
          },
          {
            name: "delete and redeploy databases",
            value: "cleanDatabase",
            checked: options.cleanDatabase
          },
          { name: "execute Helm diff", value: "diff", checked: options.diff },
          {
            name: "dry run commands",
            value: "dryRun",
            checked: options.dryRun
          },
          new Separator(
            `Press ${chalk.blue("<enter>")} to confirm configuration`
          )
        ]
      });
      if (!answer.includes("context")) {
        log(
          "log",
          `Kubernetes context unchecked, update context via: ${chalk.yellow(
            "kubectl config use-context "
          )}${chalk.blue("<context>")}`
        );
        process.exit(0);
      }
      const checkedFlags = answer.filter((value) => value != "context");
      checkedFlags.forEach((value) => (options[value] = true));
      const flags: (
        | "uninstall"
        | "clean"
        | "cleanDatabase"
        | "diff"
        | "dryRun"
      )[] = ["uninstall", "clean", "cleanDatabase", "diff", "dryRun"];
      flags
        .filter((o) => !answer.includes(o))
        .forEach((value) => (options[value] = false));
    }
  }

  private uninstallParticipant = async (
    participant: Participant,
    dryRun: boolean,
    cleanDatabase: boolean
  ) => {
    try {
      // Delete Helm releases for applications
      await execPromise(
        `helm delete -n ${this.general.namespace} ${participant.id}-tsg-sso-bridge`,
        dryRun,
        this.cwd,
        false
      );
      await execPromise(
        `helm delete -n ${this.general.namespace} ${participant.id}-tsg-wallet`,
        dryRun,
        this.cwd,
        false
      );
      if (participant.hasControlPlane) {
        await execPromise(
          `helm delete -n ${this.general.namespace} ${participant.id}-tsg-control-plane`,
          dryRun,
          this.cwd,
          false
        );
      }
      const promises = [];
      for (const [id] of participant.dataPlanes) {
        promises.push(
          execPromise(
            `helm delete -n ${this.general.namespace} ${participant.id}-tsg-${id}`,
            dryRun,
            this.cwd,
            false
          )
        );
      }
      await Promise.all(promises);

      // Delete PostgreSQL CRDs (Cluster and Databases) if cleanDatabase is true
      if (cleanDatabase) {
        if (this.general.postgresDeploymentMode === "per-participant") {
          // Delete participant's databases first
          log(
            "log",
            `Deleting PostgreSQL databases for participant ${participant.id}`
          );
          await execPromise(
            `kubectl delete database -l cnpg.io/cluster=${participant.id}-postgresql -n ${this.general.namespace} --ignore-not-found=true`,
            dryRun,
            this.cwd,
            false
          );

          // Then delete the cluster
          log(
            "log",
            `Deleting PostgreSQL cluster for participant ${participant.id}`
          );
          await execPromise(
            `kubectl delete cluster ${participant.id}-postgresql -n ${this.general.namespace} --ignore-not-found=true`,
            dryRun,
            this.cwd,
            false
          );
        } else {
          // For per-namespace mode, only delete databases for this participant
          // (Cluster is shared and should not be deleted)
          log(
            "log",
            `Deleting PostgreSQL databases for participant ${participant.id} (shared cluster)`
          );
          const databases = [
            `${participant.id}-sso-bridge-db`,
            `${participant.id}-wallet-db`
          ];
          if (participant.hasControlPlane) {
            databases.push(`${participant.id}-control-plane-db`);
          }
          for (const [id] of participant.dataPlanes) {
            databases.push(`${participant.id}-${id}-db`);
          }
          await execPromise(
            `kubectl delete database ${databases.join(" ")} -n ${this.general.namespace} --ignore-not-found=true`,
            dryRun,
            this.cwd,
            false
          );
          const databaseNames = [
            `${participant.id}-sso-bridge-db`,
            `${participant.id}-wallet-db`
          ];
          if (participant.hasControlPlane) {
            databaseNames.push(`${participant.id}-control-plane-db`);
          }
          for (const [id] of participant.dataPlanes) {
            databaseNames.push(`${participant.id}-${id}-db`);
          }
          await execPromise(
            `kubectl delete database ${databaseNames.join(" ")} -n ${this.general.namespace} --ignore-not-found=true`,
            dryRun,
            this.cwd,
            false
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  private helmRepository = (
    type: "tsg" | "cloudnativepg",
    development: boolean = false
  ) => {
    if (type === "tsg") {
      if (development) {
        return "https://gitlab.com/api/v4/projects/tno-tsg%2Fdataspace-protocol%2Ftno-security-gateway/packages/helm/devel";
      } else {
        return "https://gitlab.com/api/v4/projects/tno-tsg%2Fdataspace-protocol%2Ftno-security-gateway/packages/helm/stable";
      }
    } else {
      return "https://cloudnative-pg.github.io/charts";
    }
  };

  private async checkCloudNativePGOperator(): Promise<boolean> {
    try {
      const result = await execPromise(
        "kubectl get pods -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg -o jsonpath='{.items[*].status.phase}'",
        false,
        this.cwd,
        false,
        undefined,
        false
      );

      return result.includes("Running");
    } catch (_error) {
      return false;
    }
  }

  private async installCloudNativePGOperator(
    dryRun: boolean
  ): Promise<boolean> {
    try {
      log("log", "Installing CloudNativePG operator...");

      // Install the operator
      await execPromise(
        "helm upgrade --create-namespace --install  --namespace cnpg-system --repo https://cloudnative-pg.io/charts/ --version 0.26.0 cnpg cloudnative-pg",
        dryRun,
        this.cwd,
        false
      );

      if (!dryRun) {
        log("log", "Waiting for CloudNativePG operator to be ready...");
        await execPromise(
          "kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=cloudnative-pg -n cnpg-system --timeout=120s",
          false,
          this.cwd,
          false
        );
        log("log", "CloudNativePG operator installed successfully");
      }

      return true;
    } catch (error) {
      log("error", `Failed to install CloudNativePG operator: ${error}`);
      return false;
    }
  }

  private async ensureCloudNativePGOperator(
    dryRun: boolean,
    yes: boolean
  ): Promise<void> {
    const isInstalled = await this.checkCloudNativePGOperator();

    if (!isInstalled) {
      log("warn", "CloudNativePG operator is not installed in this cluster");

      const shouldInstall =
        yes ||
        (await confirm({
          message:
            "Would you like to install the CloudNativePG operator now? This will install the operator in the 'cnpg-system' namespace. This CLI will not delete the operator once installed.",
          default: true
        }));

      if (shouldInstall) {
        const success = await this.installCloudNativePGOperator(dryRun);
        if (!success) {
          log(
            "error",
            "Failed to install CloudNativePG operator. Please install it manually:"
          );
          log(
            "log",
            "  helm upgrade --create-namespace --install  --namespace cnpg-system --repo https://cloudnative-pg.io/charts/ --version 0.26.0 cnpg cloudnative-pg"
          );
          process.exit(1);
        }
      } else {
        log("error", "CloudNativePG operator is required for deployment");
        log("log", "Please install it manually:");
        log(
          "log",
          "  helm upgrade --create-namespace --install  --namespace cnpg-system --repo https://cloudnative-pg.io/charts/ --version 0.26.0 cnpg cloudnative-pg"
        );
        process.exit(1);
      }
    } else {
      log("log", "CloudNativePG operator is installed and running");
    }
  }

  private async installSharedPostgres(
    config: string,
    dryRun: boolean,
    yes: boolean,
    diff: boolean
  ): Promise<void> {
    log("log", "Deploying shared PostgreSQL cluster for namespace");

    // Apply PostgreSQL Cluster and Database CRDs for shared cluster (per-namespace mode)
    const postgresFile = `${config}/postgres.yaml`;
    if (fs.existsSync(postgresFile)) {
      if (diff) {
        await execPromise(
          [`kubectl diff -f ${postgresFile} -n ${this.general.namespace}`],
          dryRun,
          this.cwd,
          !yes
        );
      } else {
        await execPromise(
          [`kubectl apply -f ${postgresFile} -n ${this.general.namespace}`],
          dryRun,
          this.cwd,
          !yes
        );
      }

      if (!dryRun && !diff) {
        // Wait for cluster to be ready
        log("log", "Waiting for shared PostgreSQL cluster to be ready...");
        await execPromise(
          [
            `kubectl wait --for=condition=Ready cluster postgresql-cluster -n ${this.general.namespace} --timeout=300s || true`
          ],
          dryRun,
          this.cwd,
          !yes
        );

        // Wait for all databases to be ready
        log("log", "Waiting for all databases to be created...");
        await execPromise(
          [
            `kubectl wait --for=jsonpath='{.status.applied}'=true database --all -n ${this.general.namespace} --timeout=120s || true`
          ],
          dryRun,
          this.cwd,
          !yes
        );
      }
    }
  }

  /**
   * Checks if Helm deployments have succeeded by verifying pod status
   * @param participant The participant whose deployments should be verified
   * @param namespace Kubernetes namespace where deployments exist
   * @param timeout Maximum time to wait for deployments in seconds
   * @returns Promise that resolves to success status and details of failing deployments
   */
  private async verifyHelmDeployments(
    participant: Participant,
    namespace: string = this.general.namespace,
    timeout: number = 300
  ): Promise<{ success: boolean; failedDeployments: string[] }> {
    log("log", `Verifying deployments for ${participant.id}...`);

    // List of deployments to check based on participant configuration
    const deployments = [
      `${participant.id}-tsg-sso-bridge`,
      `${participant.id}-tsg-wallet`
    ];

    // Add control plane if participant has one
    if (participant.hasControlPlane) {
      deployments.push(`${participant.id}-tsg-control-plane`);
    }

    // Add data planes
    participant.dataPlanes.forEach((_dataPlane, id) => {
      deployments.push(`${participant.id}-tsg-${id}`);
    });

    const failedDeployments: string[] = [];
    const startTime = Date.now();

    // Function to check a single deployment's status
    const checkDeploymentStatus = async (
      deployment: string
    ): Promise<boolean> => {
      try {
        // Get deployment status using kubectl
        const statusCmd = `kubectl get deployment -n ${namespace} ${deployment} -o jsonpath='{.status.conditions[?(@.type=="Available")].status}'`;
        const status = await execPromise(
          statusCmd,
          false,
          this.cwd,
          false,
          undefined,
          false
        );

        // If available status is "True", deployment is ready
        if (status.trim() === "True") {
          return true;
        }

        // Check if pods are in error state
        const podsCmd = `kubectl get pods -n ${namespace} -l app=${deployment} -o jsonpath='{.items[*].status.phase}'`;
        const podStatus = await execPromise(
          podsCmd,
          false,
          this.cwd,
          false,
          undefined,
          false
        );

        // If any pod is in Failed state, deployment has failed
        if (podStatus.includes("Failed")) {
          log("error", `Deployment ${deployment} has failed pods`);
          return false;
        }

        // Still initializing
        return false;
      } catch (error) {
        log("error", `Error checking deployment ${deployment}: ${error}`);
        return false;
      }
    };

    // Continue checking until timeout
    while (Date.now() - startTime < timeout * 1000) {
      let allReady = true;

      // Check each deployment
      for (const deployment of deployments) {
        // eslint-disable-next-line no-await-in-loop
        const isReady = await checkDeploymentStatus(deployment);

        if (!isReady) {
          allReady = false;
          // Check if we've already waited past timeout
          if (Date.now() - startTime >= timeout * 1000) {
            failedDeployments.push(deployment);
          }
        }
      }

      if (allReady) {
        return { success: true, failedDeployments: [] };
      }

      // Wait before checking again
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // If we get here, timeout was reached
    log("error", `Deployment timeout for ${participant.id} (${timeout}s)`);
    return { success: false, failedDeployments };
  }

  private installParticipant = async (
    participant: Participant,
    config: string,
    diff: boolean,
    dryRun: boolean,
    yes: boolean,
    timeout: string
  ) => {
    const helmCommand = (...flags: string[]) =>
      execPromise(
        [
          `helm`,
          diff ? "diff upgrade -C 5" : "upgrade",
          `--create-namespace`,
          `--install`,
          ...flags
        ],
        dryRun,
        this.cwd,
        !yes,
        chalk.green("No changes")
      );

    // Apply PostgreSQL Cluster and Database CRDs (per-participant mode)
    const shouldDeployDatabase =
      this.general.postgresDeploymentMode === "per-participant" ||
      this.scope === "participant";
    if (shouldDeployDatabase && !diff) {
      const postgresFile = `${config}/${participant.id}/postgres.yaml`;
      if (fs.existsSync(postgresFile)) {
        log(
          "log",
          `Applying PostgreSQL Cluster and Database CRDs for participant ${participant.id}`
        );
        if (diff) {
          await execPromise(
            [`kubectl diff -f ${postgresFile} -n ${this.general.namespace}`],
            dryRun,
            this.cwd,
            !yes
          );
        } else {
          await execPromise(
            [`kubectl apply -f ${postgresFile} -n ${this.general.namespace}`],
            dryRun,
            this.cwd,
            !yes
          );
        }
        if (!dryRun) {
          // Wait for cluster to be ready
          log("log", `Waiting for PostgreSQL cluster to be ready...`);
          await execPromise(
            [
              `kubectl wait --for=condition=Ready cluster ${participant.id}-postgresql -n ${this.general.namespace} --timeout=300s || true`
            ],
            dryRun,
            this.cwd,
            !yes
          );

          // Wait for databases to be ready
          log("log", "Waiting for databases to be created...");
          await execPromise(
            [
              `kubectl wait --for=jsonpath='{.status.applied}'=true database -l cnpg.io/cluster=${participant.id}-postgresql -n ${this.general.namespace} --timeout=120s || true`
            ],
            dryRun,
            this.cwd,
            !yes
          );
        }
      }
    }

    await helmCommand(
      `-f ${config}/${participant.id}/values.sso-bridge.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository(
        "tsg",
        this.applications?.ssoBridge?.developmentChart ?? false
      )}`,
      `--version ${
        this.applications?.ssoBridge?.chartVersion ?? this.currentCliVersion
      }`,
      `${participant.id}-tsg-sso-bridge`,
      this.applications?.ssoBridge?.chartName ?? `tsg-sso-bridge`
    );

    await helmCommand(
      `-f ${config}/${participant.id}/values.wallet.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository(
        "tsg",
        this.applications?.wallet?.developmentChart ?? false
      )}`,
      `--version ${
        this.applications?.wallet?.chartVersion ?? this.currentCliVersion
      }`,
      `${participant.id}-tsg-wallet`,
      this.applications?.wallet?.chartName ?? `tsg-wallet`
    );

    if (participant.hasControlPlane) {
      await helmCommand(
        `-f ${config}/${participant.id}/values.control-plane.yaml`,
        `-n ${this.general.namespace}`,
        `--repo ${this.helmRepository(
          "tsg",
          this.applications?.controlPlane?.developmentChart ?? false
        )}`,
        `--version ${
          this.applications?.controlPlane?.chartVersion ??
          this.currentCliVersion
        }`,
        `${participant.id}-tsg-control-plane`,
        this.applications?.controlPlane?.chartName ?? `tsg-control-plane`
      );
    }

    for (const [id, dataPlane] of participant.dataPlanes) {
      const type = dataPlane.type ?? id;
      // eslint-disable-next-line no-await-in-loop
      await helmCommand(
        `-f ${config}/${participant.id}/values.${id}.yaml`,
        `-n ${this.general.namespace}`,
        `--repo ${this.helmRepository(
          "tsg",
          this.applications?.dataPlanes?.get(type)?.developmentChart ?? false
        )}`,
        `--version ${
          this.applications?.dataPlanes?.get(type)?.chartVersion ??
          this.currentCliVersion
        }`,
        `${participant.id}-tsg-${id}`,
        this.applications?.dataPlanes?.get(type)?.chartName ?? `tsg-${type}`
      );
    }

    // If not in diff mode and not dry run, verify deployments
    if (!diff && !dryRun) {
      const { success, failedDeployments } = await this.verifyHelmDeployments(
        participant,
        this.general.namespace,
        parseInt(timeout)
      );

      if (!success) {
        log(
          "error",
          `The following deployments failed to stabilize within the timeout period:`
        );
        failedDeployments.forEach((deployment) => {
          log("error", `  - ${deployment}`);
        });

        if (!yes) {
          const shouldContinue = await confirm({
            message:
              "Some deployments failed to stabilize. Continue with remaining operations?"
          });

          if (!shouldContinue) {
            log(
              "error",
              "Deployment process aborted due to failing deployments"
            );
            process.exit(1);
          }
        }
      } else {
        log("log", `All deployments for ${participant.id} are operational`);
      }
    }
  };
}
