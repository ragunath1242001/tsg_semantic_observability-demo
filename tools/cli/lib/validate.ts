import axios from "axios";
import semver from "semver";
import { log } from "./utils";
import { confirm } from "@inquirer/prompts";

let cliVersion: string | undefined;
let releaseVersion: string | undefined;

export const getCliVersion = () => {
  if (cliVersion) return cliVersion;
  try {
    const packageInfo = require("../../package.json");
    cliVersion = packageInfo.version;
    return packageInfo.version;
  } catch (e) {
    try {
      const packageInfo = require("../package.json");
      cliVersion = packageInfo.version;
      return packageInfo.version;
    } catch (e) {
      log("warn", "Could not retrieve current CLI version");
      return "0.0.0";
    }
  }
};

export const getLatestRelease = async () => {
  if (releaseVersion) return releaseVersion;
  try {
    const response = await axios.get(
      "https://gitlab.com/api/v4/projects/58498367/releases"
    );
    releaseVersion = response.data[0].name.slice(1);
    const currentCliVersion = getCliVersion();
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
        message: "Continue with current version?",
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
