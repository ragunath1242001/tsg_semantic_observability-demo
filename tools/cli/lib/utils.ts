import chalk, { Chalk } from "chalk";
import { exec, ExecException } from "child_process";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { Ecosystem, SingleParticipant } from "./model";

export const log = (
  type: "log" | "warn" | "error",
  message: string,
  color?: Chalk
) => {
  let logMessage = chalk.blue("[TSG-CLI] ");
  switch (type) {
    case "log":
      logMessage += chalk.green("LOG   - ");
      break;
    case "warn":
      logMessage += chalk.yellow("WARN  - ");
      break;
    case "error":
      logMessage += chalk.red("ERROR - ");
      break;
  }
  const output = type === "log" ? console.log : console.error;

  if (color) {
    logMessage += color(message);
  } else {
    logMessage += message;
  }
  output(logMessage);
};

export const execPromise = (
  command: string | string[],
  dryRun: boolean,
  cwd?: string,
  rejectOnError: boolean = true,
  onEmptyResponse?: string
) => {
  const cmd = typeof command === "string" ? command : command.join(" ");
  log(
    "log",
    chalk.green(`Executing: `) +
      chalk.yellow(cmd) +
      chalk.red(`${dryRun ? "  [[dry-run, not executing]]" : ""}`)
  );
  if (dryRun) {
    return;
  }
  return new Promise(function (resolve, reject) {
    exec(
      cmd,
      {
        encoding: "utf-8",
        cwd,
      },
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(stderr);
          if (rejectOnError) {
            reject(error);
          } else {
            resolve(stderr);
          }
          return;
        }
        if (stdout === "" && onEmptyResponse) {
          console.log(onEmptyResponse);
        } else if (stdout !== "") {
          console.log(stdout);
        }
        resolve(stdout);
      }
    );
  });
};

export const validateAndCreate = async <
  T extends Ecosystem | SingleParticipant
>(
  cls: ClassConstructor<T>,
  json: any
): Promise<T> => {
  const instance = plainToInstance(cls, json);
  await validateOrReject(instance);
  return instance;
};
