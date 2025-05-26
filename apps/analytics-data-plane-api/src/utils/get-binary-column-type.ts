import { GenericConfigModule } from "@tsg-dsp/common-api";

import { RootConfig } from "../config.js";

export const getBinaryColumnType = () => {
  return process.env.DB_MIGRATION_TYPE === "sqlite"
    ? "blob"
    : process.env.DB_MIGRATION_TYPE === "postgres"
      ? "bytea"
      : GenericConfigModule.get(RootConfig).db.type === "sqlite"
        ? "blob"
        : "bytea";
};
