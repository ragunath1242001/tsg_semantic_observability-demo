import { ModuleParser } from "./module.parser";
import { ModuleDocumentationGenerator } from "./module.documentation.generator";

const moduleParser = new ModuleParser();
const moduleDocumentationGenerator = new ModuleDocumentationGenerator();

const apps = moduleParser.parseAllApps(
  "control-plane",
  "wallet",
  "http-data-plane",
  "analytics-data-plane"
);

for (const [appName, modules] of Object.entries(apps)) {
  moduleDocumentationGenerator.generateMarkdown(appName, modules);
}
