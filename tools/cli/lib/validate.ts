import axios from "axios";
import semver from "semver";
import { log } from "./utils.js";
import { confirm } from "@inquirer/prompts";
import { fileURLToPath } from "url";
import path from "path";
import { existsSync, readFileSync } from "fs";

let cliVersion: string | undefined;
let releaseVersion: string | undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getCliVersion = async () => {
  if (cliVersion) return cliVersion;
  try {
    let packageJson: { version: string };
    if (existsSync(__dirname + "/../package.json")) {
      packageJson = JSON.parse(
        readFileSync(__dirname + "/../package.json", "utf8")
      );
    } else if (existsSync(__dirname + "/../../package.json")) {
      packageJson = JSON.parse(
        readFileSync(__dirname + "/../../package.json", "utf8")
      );
    } else {
      log(
        "warn",
        "Could not find package.json to retrieve current CLI version"
      );
      return "0.0.0";
    }
    cliVersion = packageJson.version;
    return packageJson.version;
  } catch (e) {
    console.error(e);
    log("warn", "Could not retrieve current CLI version");
    return "0.0.0";
    // }
  }
};

export const getLatestRelease = async () => {
  if (releaseVersion) return releaseVersion;
  try {
    const response = await axios.get(
      "https://gitlab.com/api/v4/projects/58498367/releases"
    );
    releaseVersion = response.data[0].name.slice(1);
    const currentCliVersion = await getCliVersion();
    if (semver.compare(releaseVersion!, currentCliVersion) === 1) {
      log(
        "warn",
        `Current version of CLI (${currentCliVersion}) is not in line with latest release version (${releaseVersion})

Install latest version by executing:
  npm install -g @tsg-dsp/cli@latest

Or install specifically the latest version:
  npm install -g @tsg-dsp/cli@${releaseVersion}
  
`
      );
      const result = await confirm({
        message: "Continue with current version?"
      });
      if (!result) {
        process.exit(0);
      }
    }

    return releaseVersion!;
  } catch (e) {
    log("warn", "Could not retrieve latest release of TSG");
    return "0.0.0";
  }
};
