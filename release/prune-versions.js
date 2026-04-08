import fs from "fs";
import path from "path";

const MAX_VERSIONS = 4;
const websiteDir = path.resolve(import.meta.dirname, "../website");
const versionsFile = path.join(websiteDir, "versions.json");
const versionedDocsDir = path.join(websiteDir, "versioned_docs");
const versionedSidebarsDir = path.join(websiteDir, "versioned_sidebars");

const versions = JSON.parse(fs.readFileSync(versionsFile, "utf-8"));

if (versions.length <= MAX_VERSIONS) {
  console.log(
    `Only ${versions.length} version(s) found, no pruning needed (max: ${MAX_VERSIONS})`
  );
  process.exit(0);
}

const keepVersions = versions.slice(0, MAX_VERSIONS);
const pruneVersions = versions.slice(MAX_VERSIONS);

console.log(`Keeping versions: ${keepVersions.join(", ")}`);
console.log(`Pruning versions: ${pruneVersions.join(", ")}`);

for (const version of pruneVersions) {
  // Remove versioned sidebar file
  const sidebarFile = path.join(
    versionedSidebarsDir,
    `version-${version}-sidebars.json`
  );
  if (fs.existsSync(sidebarFile)) {
    fs.rmSync(sidebarFile);
    console.log(`Removed sidebar: ${sidebarFile}`);
  }

  // Clean versioned_docs folder: keep only root-level JSON files
  const docsDir = path.join(versionedDocsDir, `version-${version}`);
  if (fs.existsSync(docsDir)) {
    for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
      const entryPath = path.join(docsDir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true });
      } else if (!entry.name.endsWith(".json")) {
        fs.rmSync(entryPath);
      }
    }
    console.log(`Cleaned docs folder: ${docsDir} (kept root JSON files)`);
  }
}

// Update versions.json
fs.writeFileSync(versionsFile, JSON.stringify(keepVersions, null, 2) + "\n");
console.log(`Updated ${versionsFile}`);
