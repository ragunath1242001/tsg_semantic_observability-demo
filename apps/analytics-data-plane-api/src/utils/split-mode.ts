import { GenericConfigModule } from "@tsg-dsp/common-api";

import { RootConfig } from "../config.js";

const splitMode = GenericConfigModule.get(RootConfig).split.mode;
const isClientMode = splitMode === "client";

export function splitModules<T>(
  serverModules: Array<T>,
  clientModules: Array<T> = [],
  standaloneModules: Array<T> | undefined = undefined
): Array<T> {
  if (isClientMode) {
    return clientModules;
  } else if (standaloneModules === undefined || splitMode === "server") {
    return serverModules;
  } else {
    return standaloneModules;
  }
}
