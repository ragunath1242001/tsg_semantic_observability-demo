import {
  TypedConfigModule,
  dotenvLoader,
  fileLoader,
  selectConfig
} from "nest-typed-config";
import { DynamicModule, Module } from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { inspect } from "util";

@Module({})
export class GenericConfigModule {
  static module: DynamicModule;

  private static getOrCreateModule<T extends object>(
    configClass: ClassConstructor<T>
  ): DynamicModule {
    if (this.module) {
      return this.module;
    }

    try {
      this.module = TypedConfigModule.forRoot({
        schema: configClass,
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
          const config = plainToInstance(configClass, rawConfig);
          const schemaErrors = validateSync(config, {
            whitelist: true,
            forbidNonWhitelisted: true,
            skipMissingProperties: false
          });

          if (schemaErrors.length) {
            throw new Error(
              TypedConfigModule.getConfigErrorMessage(schemaErrors) +
                "\n\n" +
                inspect(config)
            );
          }
          return config;
        }
      });
      return this.module;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
        console.log("Waiting 30 seconds before exit");
        setTimeout(() => {}, 30000);
      } else {
        console.error(err);
      }
      process.exit(1);
    }
  }

  static get<T extends object>(configClass: ClassConstructor<T>): T {
    return selectConfig(this.getOrCreateModule(configClass), configClass);
  }

  static register<T extends object>(
    configClass: ClassConstructor<T>
  ): DynamicModule {
    return this.getOrCreateModule(configClass);
  }
}
