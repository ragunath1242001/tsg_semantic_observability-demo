import { parse } from "yaml";
import {
  Applications,
  Ecosystem,
  General,
  Participant,
  SingleParticipant,
} from "./model";
import fs from "fs";
import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { getCliVersion, getLatestRelease } from "./validate";
import { execPromise, log, validateAndCreate } from "./utils";

interface Options {
  file?: string;
  uninstall: boolean;
  clean: boolean;
  cleanDatabase: boolean;
  diff: boolean;
  dryRun: boolean;
  cwd?: string;
  config: string;
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
    this.general = general;
    this.applications = applications;
    this.cwd = options.cwd;

    this.latestVersion = await getLatestRelease();
    this.currentCliVersion = getCliVersion();

    if (options.uninstall) {
      log("log", `Uninstalling ecosystem`);
      for (const participant of participants) {
        await this.uninstallParticipant(participant, options.dryRun, true);
      }
      await execPromise(
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/casdoor-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
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
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/casdoor-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
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
          false
        );
      }
      const result = await confirm({ message: "Execute upgrade?" });
      if (result) {
        log("log", `Deploying ecosystem`);
        for (const participant of participants) {
          await this.installParticipant(
            participant,
            options.config,
            false,
            options.dryRun,
            true
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
          true
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

    this.general = general;
    this.applications = applications;
    this.cwd = options.cwd;

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
        `kubectl get secrets -n ${this.general.namespace} -o name | grep 'secret/casdoor-' | xargs -L 1 kubectl delete -n ${this.general.namespace}`,
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
        false
      );
      const result = await confirm({ message: "Execute upgrade?" });
      if (result) {
        log("log", `Deploying participant`);
        await this.installParticipant(
          participant,
          options.config,
          false,
          options.dryRun,
          true
        );
      }
    } else {
      log("log", `Deploying participant`);
      await this.installParticipant(
        participant,
        options.config,
        false,
        options.dryRun,
        true
      );
    }
  };

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
        `helm delete -n ${this.general.namespace} ${participant.id}-casdoor`,
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
      if (participant.hasDataPlane) {
        await execPromise(
          `helm delete -n ${this.general.namespace} ${participant.id}-tsg-http-data-plane`,
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
    wait: boolean
  ) => {
    const helmCommand = (...flags: string[]) =>
      execPromise(
        [
          `helm`,
          diff ? "diff upgrade -C 5" : "upgrade",
          `--create-namespace`,
          `--install`,
          ...flags,
        ],
        dryRun,
        this.cwd,
        true,
        chalk.green("No changes")
      );
    await helmCommand(
      wait ? "--wait" : "",
      `-f ${config}/${participant.id}/values.postgres.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository("bitnami")}`,
      `--version ${this.applications?.postgres?.chart ?? "13.4.0"}`,
      `${participant.id}-postgresql`,
      `postgresql`
    );

    await helmCommand(
      wait ? "--wait --wait-for-jobs" : "",
      `-f ${config}/${participant.id}/values.casdoor.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository(
        "tsg",
        this.applications?.casdoor?.developmentChart ?? false
      )}`,
      `--version ${
        this.applications?.casdoor?.chart ?? this.currentCliVersion
      }`,
      `${participant.id}-casdoor`,
      `casdoor`
    );

    await helmCommand(
      wait ? "--wait" : "",
      `-f ${config}/${participant.id}/values.wallet.yaml`,
      `-n ${this.general.namespace}`,
      `--repo ${this.helmRepository(
        "tsg",
        this.applications?.casdoor?.developmentChart ?? false
      )}`,
      `--version ${this.applications?.wallet?.chart ?? this.currentCliVersion}`,
      `${participant.id}-tsg-wallet`,
      `tsg-wallet`
    );

    if (participant.hasControlPlane) {
      await helmCommand(
        wait ? "--wait" : "",
        `-f ${config}/${participant.id}/values.control-plane.yaml`,
        `-n ${this.general.namespace}`,
        `--repo ${this.helmRepository(
          "tsg",
          this.applications?.casdoor?.developmentChart ?? false
        )}`,
        `--version ${
          this.applications?.controlPlane?.chart ?? this.currentCliVersion
        }`,
        `${participant.id}-tsg-control-plane`,
        `tsg-control-plane`
      );
    }

    if (participant.hasDataPlane) {
      await helmCommand(
        wait ? "--wait" : "",
        `-f ${config}/${participant.id}/values.data-plane.yaml`,
        `-n ${this.general.namespace}`,
        `--repo ${this.helmRepository(
          "tsg",
          this.applications?.casdoor?.developmentChart ?? false
        )}`,
        `--version ${
          this.applications?.dataPlane?.chart ?? this.currentCliVersion
        }`,
        `${participant.id}-tsg-http-data-plane`,
        `tsg-http-data-plane`
      );
    }
  };
}
