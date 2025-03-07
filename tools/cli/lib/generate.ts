import { confirm, select } from "@inquirer/prompts";
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
  SingleParticipant
} from "./model.js";
import { log, validateAndCreate } from "./utils.js";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

interface Options {
  file?: string;
  output: string;
  stdout: boolean;
  yes: boolean;
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
  }

  general!: General;
  participants!: Participant[];
  applications?: Applications;

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
    await this.detectExistingFiles(options.output, options.stdout, options.yes);
    participants.forEach((participant) =>
      this.writeParticipant(participant, options)
    );
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
    await this.detectExistingFiles(options.output, options.stdout, options.yes);
    this.writeParticipant(participant, options);
  };

  private writeParticipant = (participant: Participant, options: Options) => {
    log("log", `Creating configuration for participant ${participant.name}`);
    this.writeConfig(
      "sso-bridge",
      `${options.output}/${participant.id}/values.sso-bridge.yaml`,
      { participant },
      !options.stdout
    );
    this.writeConfig(
      "postgres",
      `${options.output}/${participant.id}/values.postgres.yaml`,
      { participant },
      !options.stdout
    );
    this.writeConfig(
      "wallet",
      `${options.output}/${participant.id}/values.wallet.yaml`,
      { participant },
      !options.stdout
    );
    if (participant.hasControlPlane) {
      this.writeConfig(
        "control-plane",
        `${options.output}/${participant.id}/values.control-plane.yaml`,
        { participant },
        !options.stdout
      );
    }
    participant.dataPlanes.forEach((dataPlane: DataPlane, id: string) => {
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
      );
    });
  };

  private writeConfig = (
    templateFile: string,
    outfile: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any,
    writeFile: boolean
  ) => {
    const yaml = stringify(
      parse(
        this.eta.render(`./${templateFile}.yaml.eta`, {
          general: this.general,
          ...config,
          // participant: participant,
          participants: this.participants,
          applications: this.applications
        })
      )
    );
    if (writeFile) {
      fs.mkdirSync(path.dirname(outfile), { recursive: true });
      fs.writeFileSync(outfile, yaml);
    } else {
      process.stdout.write(`### ${outfile}\n\n${yaml}\n\n`);
    }
  };

  private detectExistingFiles = async (
    dir: string,
    stdout: boolean,
    yes: boolean
  ) => {
    if (stdout) {
      return;
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      return;
    }
    const existingFiles = fs.readdirSync(dir);
    if (existingFiles.length > 0) {
      const choice = yes
        ? "clean"
        : await select({
            message:
              "Existing files found in output directory. What do you want to do?",
            choices: [
              {
                name: "Clean",
                value: "clean",
                description: "Clean output directory"
              },
              {
                name: "Move",
                value: "move",
                description: `Move existing output directory to "${dir}.old"`
              },
              {
                name: "Continue",
                value: "continue",
                description: "Continue without cleaning"
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
      if (choice === "clean") {
        existingFiles.forEach((f) =>
          fs.rmSync(`${dir}/${f}`, { recursive: true })
        );
      }
      if (choice === "move") {
        if (fs.existsSync(`${dir}.old`)) {
          if (
            await confirm({
              message: `Folder ${dir}.old already exist, overwrite?`
            })
          ) {
            fs.rmSync(`${dir}.old`, { recursive: true, force: true });
          } else {
            process.exit(0);
          }
        }
        fs.renameSync(dir, `${dir}.old`);
        fs.mkdirSync(dir);
      }
    }
  };
}
