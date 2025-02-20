import { ConfigToMarkdown } from "@tsg-dsp/common-api";
import { RootConfig } from "./config.js";

const configToMarkdown = new ConfigToMarkdown(RootConfig);

configToMarkdown.writeToFile(
  "../../website/docs/apps/sso-bridge/configuration.md",
  "../../website/docs/apps/sso-bridge/configuration.md.template"
);
