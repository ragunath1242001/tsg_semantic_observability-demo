import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";
import fs from "fs";

const config: Config = {
  title: "TNO Security Gateway",
  tagline: "Implementation of a Participant Agent",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://tno-tsg.gitlab.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "TNO", // Usually your GitHub org/user name.
  projectName: "TNO Security Gateway", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"]
  },

  markdown: {
    mermaid: true
  },

  themes: ["@docusaurus/theme-mermaid", "docusaurus-theme-openapi-docs"],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          docItemComponent: "@theme/ApiItem"
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css"
        }
      } satisfies Preset.Options
    ]
  ],

  plugins: [
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          controlPlane: {
            specPath: "docs/apps/control-plane/openapi.yaml",
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/control-plane",
            sidebarOptions: {
              groupPathsBy: "tag"
            }
          } satisfies OpenApiPlugin.Options,
          httpDataPlane: {
            specPath: "docs/apps/http-data-plane/openapi.yaml",
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/http-data-plane",
            sidebarOptions: {
              groupPathsBy: "tag"
            }
          } satisfies OpenApiPlugin.Options,
          wallet: {
            specPath: "docs/apps/wallet/openapi.yaml",
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/wallet",
            sidebarOptions: {
              groupPathsBy: "tag"
            }
          } satisfies OpenApiPlugin.Options
        }
      }
    ],
    async function jsonLdContextPlugin(context, options) {
      const copyJson = (inputDir: string, outputDir: string) => {
        fs.mkdirSync(outputDir, { recursive: true });
        fs.readdirSync(inputDir)
          .filter((f) => f.endsWith(".json"))
          .forEach((file) => {
            fs.copyFileSync(`${inputDir}/${file}`, `${outputDir}/${file}`);
          });
      };
      return {
        name: "jsonld-context-plugin",
        async postBuild() {
          copyJson(
            `${context.siteDir}/docs`,
            `${context.outDir}/contexts/next`
          );
          fs.readdirSync(`${context.siteDir}/versioned_docs`).forEach(
            (directory) => {
              copyJson(
                `${context.siteDir}/versioned_docs/${directory}`,
                `${context.outDir}/contexts/${directory.slice(8)}`
              );
            }
          );
        }
      };
    }
  ],

  themeConfig: {
    languageTabs: [
      {
        language: "curl",
      },
      {
        language: "http"
      }
    ],
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "TNO TSG",
      logo: {
        alt: "TNO Security Gateway",
        src: "img/logo.svg",
        srcDark: "img/logoDark.svg"
      },
      items: [
        {
          type: "docsVersionDropdown"
        },
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation"
        },
        {
          type: "docSidebar",
          sidebarId: "apiSidebar",
          position: "left",
          label: "APIs"
        },
        {
          href: "/contact",
          label: "Contact"
        },
        {
          href: "https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway",
          label: "GitLab",
          position: "right"
        }
      ]
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Documentation",
              to: "/docs/"
            },
            {
              label: "APIs",
              to: "/docs/apis/control-plane/tsg-control-plane"
            },
            {
              label: "Contact",
              to: "/contact/"
            }
          ]
        },

        {
          title: "More",
          items: [
            {
              href: "https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway",
              label: "GitLab"
            },
            {
              href: "https://tno.nl",
              label: "TNO"
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TNO.`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula
    }
  } satisfies Preset.ThemeConfig
};

export default config;
