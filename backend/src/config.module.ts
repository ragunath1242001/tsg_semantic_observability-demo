import { TypedConfigModule, dotenvLoader, fileLoader, selectConfig } from "nest-typed-config";
import { RootConfig } from "./config.js";
import { DynamicModule } from "@nestjs/common";


let configModule: DynamicModule
let rootConfig: RootConfig
try {
  configModule = TypedConfigModule.forRoot({
    schema: RootConfig,
    load: [
      fileLoader({
        basename: 'config',
        loaders: {
          '.js': () => null,
          '.cjs': () => null,
          '.mjs': () => null
        }
      }),
      dotenvLoader({
        separator: "__",
        keyTransformer: (key) => key.toLowerCase().replace(/([a-z]_[a-z])/g, g => g[0] + g[2].toUpperCase()),
      }),
    ],
    // validationOptions: {
      
    // }
  });
  rootConfig = selectConfig(configModule, RootConfig);
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
}
export const ConfigModule = configModule;
export const config = rootConfig;