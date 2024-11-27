import { existsSync, writeFileSync } from "fs";
import { ModuleStructure } from "./module.parser";

export class ModuleDocumentationGenerator {
  generateMarkdown(
    appName: string,
    modules: { [className: string]: ModuleStructure }
  ) {
    let markdown = `# ${appName
      .replace("-", " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase())}\n`;
    markdown += `This document outlines the modules and their dependencies for the ${appName} application.\n`;

    const moduleList: ModuleStructure[] = Object.values(modules);
    for (const module of moduleList) {
      markdown += `\n\n## ${module.className}\n`;

      markdown += `\n\n### Imports\n`;
      if (module.imports.length) {
        markdown += module.imports.map((i: string) => `- ${i}`).join("\n");
      } else {
        markdown += "- _None_";
      }

      markdown += `\n\n### Controllers\n`;
      if (module.controllers.length) {
        markdown += module.controllers.map((c: string) => `- ${c}`).join("\n");
      } else {
        markdown += "- _None_";
      }

      markdown += `\n\n### Providers\n`;
      if (module.providers.length) {
        markdown += module.providers.map((p: string) => `- ${p}`).join("\n");
      } else {
        markdown += "- _None_";
      }

      markdown += `\n\n### Exports\n`;
      if (module.exports.length) {
        markdown += module.exports.map((e: string) => `- ${e}`).join("\n");
      } else {
        markdown += "- _None_";
      }

      markdown += "\n";
    }
    if (existsSync(`../../website/docs/apps/${appName}`)) {
      writeFileSync(`../../website/docs/apps/${appName}/modules.md`, markdown);
    }
  }
}
