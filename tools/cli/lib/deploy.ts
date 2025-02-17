import { parse } from "yaml";
import {
  Applications,
  Ecosystem,
  General,
  Participant,
  SingleParticipant
} from "./model.js";
import fs from "fs";
import { checkbox, confirm, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { getCliVersion, getLatestRelease } from "./validate.js";
import { execPromise, log, validateAndCreate } from "./utils.js";

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
      for (const participant of participants) {
        await this.uninstallParticipant(participant, options.dryRun, true);
      }
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
      for (const participant of participants) {
        await this.uninstallParticipant(
          participant,
          options.dryRun,
          options.cleanDatabase
        );
      }
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/sso-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
        options.dryRun,
        this.cwd
      );
    }

    if (options.diff) {
      log("log", `Determining differences for ecosystem`);
      for (const participant of participants) {
        await this.installParticipant(
          participant,
          options.config,
          true,
          false,
          false,
          options.yes
        );
      }
      if (options.yes || (await confirm({ message: "Execute upgrade?" }))) {
        log("log", `Deploying ecosystem`);
        for (const participant of participants) {
          await this.installParticipant(
            participant,
            options.config,
            false,
            options.dryRun,
            true,
            options.yes
          );
        }
      }
    } else {
      log("log", `Deploying ecosystem`);
      for (const participant of participants) {
        await this.installParticipant(
          participant,
          options.config,
          false,
          options.dryRun,
          true,
          options.yes
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
        false,
        options.yes
      );
      if (options.yes || (await confirm({ message: "Execute upgrade?" }))) {
        log("log", `Deploying participant`);
        await this.installParticipant(
          participant,
          options.config,
          false,
          options.dryRun,
          true,
          options.yes
        );
      }
    } else {
      log("log", `Deploying participant`);
      await this.installParticipant(
        participant,
        options.config,
        false,
        options.dryRun,
        true,
        options.yes
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
        `helm delete -n ${this.general.namespace} ${participant.id}-sso-bridge`,
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
      for (const [id] of participant.dataPlanes) {
        await execPromise(
          `helm delete -n ${this.general.namespace} ${participant.id}-tsg-${id}`,
          dryRun,
          this.cwd,
          false
        );
      }
    } catch (e) {}
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

  private installParticipant = async (
    participant: Participant,
    config: string,
    diff: boolean,
    dryRun: boolean,
    wait: boolean,
    yes: boolean
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
      wait ? "--wait" : "",
      `-f ${config}/${participant.id}/values.postgres.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository("bitnami")}`,
      `--version ${this.applications?.postgres?.chartVersion ?? "13.4.0"}`,
      `${participant.id}-postgresql`,
      this.applications?.postgres?.chartName ?? `postgresql`
    );

    await helmCommand(
      wait ? "--wait" : "",
      `-f ${config}/${participant.id}/values.sso-bridge.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository(
        "tsg",
        this.applications?.ssoBridge?.developmentChart ?? false
      )}`,
      `--version ${
        this.applications?.ssoBridge?.chartVersion ?? this.currentCliVersion
      }`,
      `${participant.id}-sso-bridge`,
      this.applications?.ssoBridge?.chartName ?? `tsg-sso-bridge`
    );

    await helmCommand(
      wait ? "--wait" : "",
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
        wait ? "--wait" : "",
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
      await helmCommand(
        wait ? "--wait" : "",
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
  };
}
