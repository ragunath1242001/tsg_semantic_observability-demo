import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";
import fs from "fs";
import { themes as prismThemes } from "prism-react-renderer";

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
  onBrokenMarkdownLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"]
  },

  clientModules: [require.resolve("./src/scripts/mermaid_icons.js")],

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
    function nodePathPolyfillPlugin() {
      return {
        name: "node-path-polyfill-plugin",
        configureWebpack() {
          return {
            resolve: {
              fallback: {
                path: false
              }
            }
          };
        }
      };
    },
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          analyticsDataPlane: {
            specPath: "docs/apps/analytics-data-plane/openapi.yaml",
            downloadUrl: "openapi.yaml",
            showSchemas: true,
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/analytics-data-plane",
            sidebarOptions: {
              groupPathsBy: "tag",
              sidebarCollapsed: false
            }
          } satisfies OpenApiPlugin.Options,
          controlPlane: {
            specPath: "docs/apps/control-plane/openapi.yaml",
            downloadUrl: "openapi.yaml",
            showSchemas: true,
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/control-plane",
            sidebarOptions: {
              groupPathsBy: "tag",
              sidebarCollapsed: false
            }
          } satisfies OpenApiPlugin.Options,
          httpDataPlane: {
            specPath: "docs/apps/http-data-plane/openapi.yaml",
            downloadUrl: "openapi.yaml",
            showSchemas: true,
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/http-data-plane",
            sidebarOptions: {
              groupPathsBy: "tag",
              sidebarCollapsed: false
            }
          } satisfies OpenApiPlugin.Options,
          ssoBridge: {
            specPath: "docs/apps/sso-bridge/openapi.yaml",
            downloadUrl: "openapi.yaml",
            showSchemas: true,
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/sso-bridge",
            sidebarOptions: {
              groupPathsBy: "tag",
              sidebarCollapsed: false
            }
          } satisfies OpenApiPlugin.Options,
          wallet: {
            specPath: "docs/apps/wallet/openapi.yaml",
            downloadUrl: "openapi.yaml",
            showSchemas: true,
            hideSendButton: true,
            showExtensions: false,
            outputDir: "docs/apis/wallet",
            sidebarOptions: {
              groupPathsBy: "tag",
              sidebarCollapsed: false
            }
          } satisfies OpenApiPlugin.Options
        }
      }
    ],
    async function openApiYamlPlugin(context) {
      const copyYaml = (inputDir: string, outputDir: string) => {
        if (fs.existsSync(inputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          fs.readdirSync(inputDir)
            .filter((f) => f.endsWith(".yaml"))
            .forEach((file) => {
              fs.copyFileSync(`${inputDir}/${file}`, `${outputDir}/${file}`);
            });
        }
      }
      return {
        name: "openapi-yaml-plugin",
        async postBuild() {
          ["analytics-data-plane", "control-plane", "http-data-plane", "sso-bridge", "wallet"].forEach((api) => {
            copyYaml(
              `${context.siteDir}/docs/apps/${api}`,
              `${context.outDir}/docs/next/apis/${api}`
            );
            fs.readdirSync(`${context.siteDir}/versioned_docs`).forEach(
              (directory) => {
                copyYaml(
                  `${context.siteDir}/versioned_docs/${directory}/apps/${api}`,
                  `${context.outDir}/docs/${directory.slice(8)}/apis/${api}`
                );
              });
          });
        }
      }
          
        
    },
    async function jsonLdContextPlugin(context) {
      const copyJson = (inputDir: string, outputDir: string) => {
        if (fs.existsSync(inputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          fs.readdirSync(inputDir)
            .filter((f) => f.endsWith(".json"))
            .forEach((file) => {
              fs.copyFileSync(`${inputDir}/${file}`, `${outputDir}/${file}`);
            });
        }
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
    algolia: {
      appId: "5NIQZCN267",
      apiKey: "abee9a686c4f8f2348de8161de60bb08",
      indexName: "TSG Docusaurus Docs",
      contextualSearch: true,
    },
    metadata: [{
      name: "algolia-site-verification",
      content: "3DDEE612BC25AA77"
    }],
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
          type: "dropdown",
          position: "left",
          label: "APIs",
          items: [
            {
              type: "docSidebar",
              sidebarId: "controlPlaneSidebar",
              label: "Control Plane"
            },
            {
              type: "docSidebar",
              sidebarId: "httpDataPlaneSidebar",
              label: "HTTP Data Plane"
            },
            {
              type: "docSidebar",
              sidebarId: "walletSidebar",
              label: "Wallet"
              
            },
            {
              type: "docSidebar",
              sidebarId: "analyticsdataPlaneSidebar",
              label: "Analytics Data Plane"
            },
            {
              type: "docSidebar",
              sidebarId: "ssoBridgeSidebar",
              label: "SSO Bridge"
            }
          ]
        },
        {
          type: "docSidebar",
          sidebarId: "playgroundSidebar",
          position: "left",
          label: "Playground"
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
