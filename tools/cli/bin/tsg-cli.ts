#!/usr/bin/env node
import { Argument, Command } from "@commander-js/extra-typings";
import { Generate } from "../lib/generate";
import { Deploy } from "../lib/deploy";
import { getCliVersion, getLatestRelease } from "../lib/validate";
import { log } from "../lib/utils";

const program = new Command();
const generate = new Generate();
const deploy = new Deploy();

program
  .name("tsg-cli")
  .version(getCliVersion(), "-v, --version", "output the current version");

program
  .command("bootstrap")
  .description("Bootstrap CLI utility to generate configuration files")
  .addArgument(
    new Argument("<scope>", "scope of configuration generation")
      .choices(["ecosystem", "participant"])
      .argRequired()
  )
  .option(
    "-f, --file <file>",
    'input configuration file (default: "ecosystem.yaml" or "participant.yaml")'
  )
  .option("-o, --output <dir>", "output directory", "output")
  .option("--stdout", "output only to standard out", false)
  .option("-v, --verbose", "verbose logging", false)
  .action(async (scope, options) => {
    await getLatestRelease();
    try {
      if (scope === "ecosystem") {
        await generate.writeEcosystem(options);
      } else if (scope === "participant") {
        await generate.writeSingleParticipant(options);
      }
    } catch (e) {
      log("error", `Error during execution!\n${e}`);
      if (options.verbose) {
        console.error(e);
      } else {
        process.exit(1);
      }
    }
  });

program
  .command("deploy")
  .description(
    "Deploy configuration to an Kubernetes cluster (requires Helm to be installed)"
  )
  .addArgument(
    new Argument("<scope>", "scope of deployment")
      .choices(["ecosystem", "participant"])
      .argRequired()
  )
  .option(
    "-f, --file <file>",
    'input configuration file (default: "ecosystem.yaml" or "participant.yaml")'
  )
  .option(
    "--config <dir>",
    'config file location (created by the "bootstrap" command)',
    "output"
  )
  .option("-u, --uninstall", "only uninstall charts and secrets", false)
  .option("-c, --clean", "uninstall existing charts before installing", false)
  .option("--clean-database", "uninstall database while cleaning", false)
  .option("-d, --diff", "show diffs before deployment", false)
  .option("--dry-run", "dry run commands", false)
  .option("--cwd <cwd>", "working directory for the configuration files")
  .option("-v, --verbose", "verbose logging", false)
  .action(async (scope, options) => {
    await getLatestRelease();
    if (options.uninstall && (options.clean || options.diff)) {
      log(
        "warn",
        "Uninstall and clean or diff are selected, clean and diff are ignored."
      );
    }
    try {
      if (scope === "ecosystem") {
        await deploy.deployEcosystem(options);
      } else if (scope === "participant") {
        await deploy.deploySingleParticipant(options);
      }
    } catch (e) {
      log("error", `Error during execution!\n${e}`);
      if (options.verbose) {
        console.error(e);
      } else {
        process.exit(1);
      }
    }
  });

(async () => {
  await program.parseAsync();
})();
