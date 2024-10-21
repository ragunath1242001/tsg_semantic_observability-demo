import { ConventionalGitClient } from "@conventional-changelog/git-client";
import { Bumper } from "conventional-recommended-bump";
import semver from "semver";

const conventionalClient = new ConventionalGitClient(process.cwd());
const currentVersion = await conventionalClient.getVersionFromTags();
const bumper = new Bumper(conventionalClient).loadPreset("conventionalcommits");
const recommendation = await bumper.bump();

const newVersion = semver.inc(
  currentVersion ?? "0.0.0",
  recommendation.releaseType
);

console.log(newVersion);
process.exit();
