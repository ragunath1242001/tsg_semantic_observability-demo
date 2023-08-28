import { TypedConfigModule, dotenvLoader, fileLoader, selectConfig } from "nest-typed-config";
import { RootConfig } from "./config.js";

export const ConfigModule = TypedConfigModule.forRoot({
  schema: RootConfig,
  load: [
    fileLoader(),
    dotenvLoader({
      separator: "__",
      keyTransformer: (key) => key.toLowerCase().replace(/([a-z]_[a-z])/g, g => g[0] + g[2].toUpperCase()),
    }),
  ],
  validationOptions: {
    
  }
});

export const rootConfig = selectConfig(ConfigModule, RootConfig);