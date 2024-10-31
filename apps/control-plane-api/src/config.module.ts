import {
  TypedConfigModule,
  dotenvLoader,
  fileLoader,
  selectConfig
} from "nest-typed-config";
import { RootConfig } from "./config";
import { DynamicModule } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

let configModule: DynamicModule;
let rootConfig: RootConfig;
try {
  configModule = TypedConfigModule.forRoot({
    schema: RootConfig,
    load: [
      fileLoader({
        basename: "config",
        ...(process.env["CONFIG_PATH"]
          ? { absolutePath: process.env["CONFIG_PATH"] }
          : {}),
        loaders: {
          ".js": () => null,
          ".cjs": () => null,
          ".mjs": () => null
        }
      }),
      dotenvLoader({
        separator: "__",
        keyTransformer: (key) => {
          if (key.startsWith("TSG__")) {
            return key
              .slice(5)
              .toLowerCase()
              .replace(/([a-z]_[a-z])/g, (g) => g[0] + g[2].toUpperCase());
          } else {
            return "";
          }
        }
      })
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate: (rawConfig: any) => {
      delete rawConfig[""];
      const config = plainToInstance(RootConfig, rawConfig);
      const schemaErrors = validateSync(config, {
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false
      });

      if (schemaErrors.length) {
        throw new Error(TypedConfigModule.getConfigErrorMessage(schemaErrors));
      }
      return config as RootConfig;
    }
  });

  rootConfig = selectConfig(configModule, RootConfig);
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
    setTimeout(() => console.log("Waiting 30 seconds before exit"), 30000);
  } else {
    console.error(err);
  }
  process.exit(1);
}
export const ConfigModule = configModule;
export const config = rootConfig;
