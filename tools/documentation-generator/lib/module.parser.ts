import { globSync, readFileSync } from "fs";

export interface ModuleStructure {
  className: string;
  file?: string;
  imports: string[];
  controllers: string[];
  providers: string[];
  exports: string[];
}

export type Patterns = "imports" | "controllers" | "providers" | "exports";

export class ModuleParser {
  // Main pattern to match entire @Module decorator
  // modulePattern = /@Module\(\s*{([^}]*)}\s*\)/s;
  classPattern = /export\s+\w+\s+(\w+Module)/;

  sections: Patterns[] = ["imports", "controllers", "providers", "exports"];
  // Section patterns
  sectionPatterns: Record<Patterns, RegExp> = {
    imports: /imports\s*:\s*\[([\s\S]*?)\]/,
    controllers: /controllers\s*:\s*\[([\s\S]*?)\]/,
    providers: /providers\s*:\s*\[([\s\S]*?)\]/,
    exports: /exports\s*:\s*\[([\s\S]*?)\]/
  };

  // Pattern for dynamic registrations like .forRoot()
  dynamicRegistration = /(\w+)\.(?:forRoot|forFeature|register)\(([\s\S]*?)\)/g;

  // Pattern for spread operator usage
  spreadOperator = /\.{3}(\w+)/g;

  parse(content: string) {
    // Remove module function calls and spread operators
    content = content.replace(/([a-zA-Z]+)\.[a-zA-Z]+\([\s\S]*?\)/g, "$1");
    content = content.replace(/\.{3}.+\n/g, "");

    // const decorator = content.match(this.modulePattern)?.[1] || "";
    const className = content.match(this.classPattern)?.[1] || "";

    const result: ModuleStructure = {
      className: className,
      imports: [],
      controllers: [],
      providers: [],
      exports: []
    };

    for (const sectionKey of this.sections) {
      const pattern = this.sectionPatterns[sectionKey];
      const section = content.match(pattern)?.[1];
      if (section) {
        // Split by commas but handle nested structures
        result[sectionKey] = section
          .split(/,(?![^[]*])/g) // Split on commas not inside brackets
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return result;
  }

  parseModuleFile(file: string): ModuleStructure {
    const content = readFileSync(file, "utf-8");
    return this.parse(content);
  }

  parseAllModules(app: string): { [className: string]: ModuleStructure } {
    return Object.fromEntries(
      globSync(`../../apps/${app}-api/**/*.module.ts`).map((file) => {
        const result = this.parseModuleFile(file);
        result["file"] = file;
        return [result.className, result];
      })
    );
  }

  parseAllApps(...apps: string[]): {
    [app: string]: { [className: string]: ModuleStructure };
  } {
    return Object.fromEntries(
      apps.map((app) => [app, this.parseAllModules(app)])
    );
  }
}
