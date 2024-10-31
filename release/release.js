import { ConventionalGitClient } from "@conventional-changelog/git-client";
import conventionalChangelog from "conventional-changelog";
import { readdirSync } from "fs";
import { Bumper } from "conventional-recommended-bump";
import semver from "semver";
import fs from "fs";
import {
  setConfig,
  setRemote,
  commitChanges,
  createRelease
} from "./gitlab.js";

const debug = process.argv[2] === "debug";

const conventionalClient = new ConventionalGitClient(process.cwd());
const currentVersion = await conventionalClient.getVersionFromTags();
const bumper = new Bumper(conventionalClient).loadPreset("conventionalcommits");
const recommendation = await bumper.bump();

const newVersion = semver.inc(
  currentVersion ?? "0.0.0",
  recommendation.releaseType
);

async function readPkgAndWriteVersion(path, newVersion) {
  const pkgFile = fs.readFileSync(path);
  const pkg = JSON.parse(pkgFile);
  if (debug) {
    console.log(`DEBUG: Not updating ${path} with version`);
  } else {
    fs.writeFileSync(path, pkgFile.toString().replace(pkg.version, newVersion));
    await conventionalClient.add(path);
  }
  return pkg;
}

async function readChartAndWriteVersion(path, newVersion) {
  const chartFile = fs.readFileSync(path);
  if (debug) {
    console.log(`DEBUG: Not updating ${path} with version`);
  } else {
    const chart = chartFile.toString();
    const replacedVersion = chart.replace(
      /^(appV|v)?ersion: .*/gm,
      `$1ersion: ${newVersion}`
    );
    fs.writeFileSync(path, replacedVersion);
    await conventionalClient.add(path);
  }
  const name = /^name: (?<name>.*)$/gm.exec(chartFile).groups.name;
  return {
    name: `@chart/${name}`
  };
}

function getChildFolders(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((f) => f.isDirectory())
    .map((f) => `${path}/${f.name}`);
}

const npmfolders = [
  ...getChildFolders("apps"),
  ...getChildFolders("libs"),
  ...getChildFolders("tools")
];
const helmfolders = getChildFolders("helm-charts");
const projects = [];
for (const folder of npmfolders) {
  const pkg = await readPkgAndWriteVersion(
    `${folder}/package.json`,
    newVersion
  );
  projects.push({
    path: folder,
    title: pkg.name,
    pkg: pkg
  });
}
for (const folder of helmfolders) {
  const chart = await readChartAndWriteVersion(
    `${folder}/Chart.yaml`,
    newVersion
  );
  projects.push({
    path: folder,
    title: chart.name
  });
}

await readPkgAndWriteVersion("package.json", newVersion);

let changelog = `# ${process.env.TITLE} v${newVersion} (${
  new Date().toISOString().split("T")[0]
})

`;
for (const project of projects) {
  const stream = conventionalChangelog(
    {
      preset: "conventionalcommits"
    },
    {
      version: newVersion,
      title: project.title
    },
    { path: project.path },
    {},
    {
      headerPartial: `## ${project.title}\n`
    }
  );
  let result = "";
  for await (const line of stream) {
    result += line.toString();
  }
  if (!result.includes("###")) {
    result += `\n\nNo changes in ${project.title} in this release\n\n\n`;
  }
  changelog += result;
}
console.log(`\nCreated changelog for version ${newVersion}:
------------------------\n\n`);
console.log(changelog);
console.log(`\n\n------------------------\n\n`);

if (debug) {
  console.log("DEBUG: Not committing changes");
  console.log("DEBUG: Not creating a new git tag");
} else {
  await setConfig(process.env.GIT_EMAIL, process.env.GIT_NAME);
  await setRemote();
  await commitChanges(conventionalClient, newVersion);
  await createRelease(newVersion, changelog);
}
