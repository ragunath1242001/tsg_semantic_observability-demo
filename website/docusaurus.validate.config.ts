import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

import DocusaurusConfig from "./docusaurus.config";

export default {
  ...DocusaurusConfig,
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          docItemComponent: "@theme/ApiItem",
          disableVersioning: true
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css"
        }
      } satisfies Preset.Options
    ]
  ],
} as Config;