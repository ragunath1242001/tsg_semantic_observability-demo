import { ConfigToMarkdown } from "@tsg-dsp/common-api";

import { RootConfig } from "./config.js";

const configToMarkdown = new ConfigToMarkdown(RootConfig);

configToMarkdown.writeToFile(
  "../../website/docs/apps/http-data-plane/configuration.md",
  "../../website/docs/apps/http-data-plane/configuration.md.template"
);
