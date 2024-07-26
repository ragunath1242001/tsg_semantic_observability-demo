import { Eta } from "eta";
import { parse, stringify } from "yaml";
import {
  Applications,
  Ecosystem,
  General,
  Participant,
  SingleParticipant,
} from "./model";
import fs, { rmSync } from "fs";
import path from "path";
import process from "process";
import { select } from "@inquirer/prompts";
import { log, validateAndCreate } from "./utils";

interface Options {
  file?: string;
  output: string;
  stdout: boolean;
}

export class Generate {
  eta!: Eta;
  constructor() {
    if (fs.existsSync(__dirname + "/../../templates")) {
      this.eta = new Eta({
        views: __dirname + "/../../templates",
        autoTrim: false,
        autoEscape: false,
      });
    } else if (fs.existsSync(__dirname + "/../templates")) {
      this.eta = new Eta({
        views: __dirname + "/../templates",
        autoTrim: false,
        autoEscape: false,
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
    this.general = general;
    this.applications = applications;
    this.participants = participants;
    await this.detectExistingFiles(options.output);
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

    this.general = general;
    this.applications = applications;
    this.participants = [];
    await this.detectExistingFiles(options.output);
    this.writeParticipant(participant, options);
  };

  private writeParticipant = (participant: Participant, options: Options) => {
    log("log", `Creating configuration for participant ${participant.name}`);
    this.writeConfig(
      "casdoor",
      `${options.output}/${participant.id}/values.casdoor.yaml`,
      participant,
      !options.stdout
    );
    this.writeConfig(
      "postgres",
      `${options.output}/${participant.id}/values.postgres.yaml`,
      participant,
      !options.stdout
    );
    this.writeConfig(
      "wallet",
      `${options.output}/${participant.id}/values.wallet.yaml`,
      participant,
      !options.stdout
    );
    if (participant.hasControlPlane) {
      this.writeConfig(
        "control-plane",
        `${options.output}/${participant.id}/values.control-plane.yaml`,
        participant,
        !options.stdout
      );
    }
    if (participant.hasDataPlane) {
      this.writeConfig(
        "data-plane",
        `${options.output}/${participant.id}/values.data-plane.yaml`,
        participant,
        !options.stdout
      );
    }
  };

  private writeConfig = (
    templateFile: string,
    outfile: string,
    participant: Participant,
    writeFile: boolean
  ) => {
    const yaml = stringify(
      parse(
        this.eta.render(`./${templateFile}.yaml.eta`, {
          general: this.general,
          participant: participant,
          participants: this.participants,
          applications: this.applications,
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

  private detectExistingFiles = async (dir: string) => {
    const existingFiles = fs.readdirSync(dir);
    if (existingFiles.length > 0) {
      const choice = await select({
        message:
          "Existing files found in output directory. What do you want to do?",
        choices: [
          {
            name: "Clean",
            value: "clean",
            description: "Clean output directory",
          },
          {
            name: "Move",
            value: "move",
            description: `Move existing output directory to "${dir}.old"`,
          },
          {
            name: "Continue",
            value: "continue",
            description: "Continue without cleaning",
          },
          {
            name: "Abort",
            value: "abort",
            description: "Abort the operation",
          },
        ],
      });
      if (choice === "abort") {
        process.exit(0);
      }
      if (choice === "clean") {
        existingFiles.forEach((f) =>
          rmSync(`${dir}/${f}`, { recursive: true })
        );
      }
      if (choice === "move") {
        fs.renameSync(dir, `${dir}.old`);
        fs.mkdirSync(dir);
      }
    }
  };
}
