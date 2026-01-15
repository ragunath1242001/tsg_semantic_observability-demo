import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { ChalkInstance } from "chalk";
import { exec, ExecException } from "child_process";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync, ValidationError } from "class-validator";

import { Ecosystem, SingleParticipant } from "./model.js";

export const log = (
  type: "log" | "warn" | "error",
  message: string,
  color?: ChalkInstance
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
  confirmOnError: boolean = true,
  onEmptyResponse?: string,
  logStdout: boolean = true,
  logCommand: boolean = logStdout
): Promise<[string, string]> => {
  const cmd = typeof command === "string" ? command : command.join(" ");
  if (logCommand) {
    log(
      "log",
      chalk.green(dryRun ? `Dry-run: ` : `Executing: `) + chalk.yellow(cmd)
    );
  }
  if (dryRun) {
    return Promise.resolve(["", ""]);
  }
  return new Promise(function (resolve, reject) {
    exec(
      cmd,
      {
        encoding: "utf-8",
        cwd
      },
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(stderr);
          if (confirmOnError) {
            const controller = new AbortController();
            const promise = confirm(
              {
                message: "Error executing command, continue?"
              },
              { signal: controller.signal }
            );
            Promise.race([
              promise,
              new Promise((resolve) =>
                setTimeout(() => {
                  console.log();
                  log("log", "No response within 30 seconds, continuing");
                  controller.abort();
                  resolve(true);
                }, 30000)
              )
            ]).then((result) => {
              if (result) {
                resolve([stderr, ""]);
              } else {
                reject(error);
              }
            });
          } else {
            resolve([stderr, stdout]);
          }
          return;
        }
        if (logStdout) {
          if (stdout === "" && onEmptyResponse) {
            console.log(onEmptyResponse);
          } else if (stdout !== "") {
            console.log(stdout);
          }
        }
        resolve([stdout, stderr]);
      }
    );
  });
};

export const colorizeDiff = (diff: string): string => {
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
      if (line.endsWith(" has been added:")) {
        return chalk.green(line);
      }
      if (line.endsWith(" has changed:")) {
        return chalk.yellow(line);
      }
      if (line.endsWith(" has been removed:")) {
        return chalk.red(line);
      }
      if (line.endsWith(" changed ownership:")) {
        return chalk.magenta(line);
      }
      if (line.endsWith("has changed, but diff is empty after suppression.")) {
        return chalk.blue(line);
      }
      return line;
    })
    .join("\n");
};

export const escapeYamlYKeys = (yamlString: string): string => {
  // Match keys that are exactly 'y', 'Y', 'yes', 'YES', 'n', 'N', 'no', 'NO', 'true', 'TRUE', 'false', 'FALSE', 'on', 'OFF', etc.
  return yamlString.replace(
    /^(\s*)(y|Y|n|N|yes|YES|no|NO|true|TRUE|false|FALSE|on|ON|off|OFF)(:)/gm,
    '$1"$2"$3'
  );
};

export const validateAndCreate = async <
  T extends Ecosystem | SingleParticipant
>(
  cls: ClassConstructor<T>,
  json: object
): Promise<T> => {
  const instance = plainToInstance(cls, json);
  const schemaErrors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false
  });
  if (schemaErrors.length > 0) {
    throw getConfigErrorMessage(schemaErrors);
  }
  return instance;
};

// Borrowed from https://github.com/Nikaple/nest-typed-config to ensure similar config messages
export const getConfigErrorMessage = (errors: ValidationError[]): string => {
  const messages = formatValidationError(errors)
    .map(({ property, value, constraints }) => {
      const constraintMessage = Object.entries(
        constraints || /* istanbul ignore next */ {}
      )
        .map(
          ([key, val]) =>
            `    - ${key}: ${chalk.yellow(
              val
            )}, current config is \`${chalk.blue(JSON.stringify(value))}\``
        )
        .join(`\n`);
      const msg = [
        `  - config ${chalk.cyan(
          property
        )} does not match the following rules:`,
        `${constraintMessage}`
      ].join(`\n`);
      return msg;
    })
    .filter(Boolean)
    .join(`\n`);
  const configErrorMessage = chalk.red(
    `Configuration is not valid:\n${messages}\n`
  );
  return configErrorMessage;
};

/**
 * Transforms validation error object returned by class-validator to more
 * readable error messages.
 */
const formatValidationError = (errors: ValidationError[]) => {
  const result: {
    property: string;
    constraints: ValidationError["constraints"];
    value: ValidationError["value"];
  }[] = [];
  const helper = (
    { property, constraints, children, value }: ValidationError,
    prefix: string
  ) => {
    const keyPath = prefix ? `${prefix}.${property}` : property;
    if (constraints) {
      result.push({
        property: keyPath,
        constraints,
        value
      });
    }
    if (children && children.length) {
      children.forEach((child) => helper(child, keyPath));
    }
  };
  errors.forEach((error) => helper(error, ``));
  return result;
};
