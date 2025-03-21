import { checkbox, confirm, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs";
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

export class Deploy {
  general!: General;
  applications?: Applications;
  cwd?: string;
  latestVersion!: string;
  currentCliVersion!: string;

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

    await this.confirmOptions(options);

    if (options.uninstall) {
      log("log", `Uninstalling ecosystem`);
      const promises = [];
      for (const participant of participants) {
        promises.push(
          this.uninstallParticipant(participant, options.dryRun, true)
        );
      }
      await Promise.all(promises);
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/sso-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
        options.dryRun,
        this.cwd
      );
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

    await this.confirmOptions(options);

    if (options.uninstall) {
      log("log", `Uninstalling participant`);
      await this.uninstallParticipant(participant, options.dryRun, true);
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
      if (cleanDatabase) {
        await execPromise(
          `helm delete -n ${this.general.namespace} ${participant.id}-postgresql`,
          dryRun,
          this.cwd,
          false
        );
      }
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
    } catch (e) {
      console.log(e);
    }
  };

  private helmRepository = (
    type: "tsg" | "bitnami",
    development: boolean = false
  ) => {
    if (type === "tsg") {
      if (development) {
        return "https://nexus.dataspac.es/repository/dsp-development";
      } else {
        return "https://nexus.dataspac.es/repository/dsp-stable";
      }
    } else {
      return "https://charts.bitnami.com/bitnami";
    }
  };

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

    await helmCommand(
      `-f ${config}/${participant.id}/values.postgres.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository("bitnami")}`,
      `--version ${this.applications?.postgres?.chartVersion ?? "13.4.0"}`,
      `${participant.id}-postgresql`,
      this.applications?.postgres?.chartName ?? `postgresql`
    );

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
