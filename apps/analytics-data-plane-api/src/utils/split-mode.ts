import { GenericConfigModule } from "@tsg-dsp/common-api";

import { RootConfig } from "../config.js";

const splitMode = GenericConfigModule.get(RootConfig).split.mode;
const isClientMode = splitMode === "client";

export function splitModules<TServer, TClient = never, TStandalone = never>(
  serverModules: Array<TServer>,
  clientModules: Array<TClient> = [],
  standaloneModules: Array<TStandalone> | undefined = undefined
): Array<TServer | TClient | TStandalone> {
  if (isClientMode) {
    return clientModules;
  } else if (standaloneModules === undefined || splitMode === "server") {
    return serverModules;
  } else {
    return standaloneModules;
  }
}
