#!/usr/bin/env node

import { Command } from "commander";
import { createElement } from "react";

import { App } from "./app.js";
import { withFullScreen } from "./fullscreen/index.js";
import type { AppConfig } from "./types.js";

const program = new Command();

program
  .name("adp-tui")
  .description(
    "Terminal User Interface for the Analytics Data Plane (Client Mode)"
  )
  .version("0.17.0")
  .requiredOption(
    "-u, --url <url>",
    "ADP API base URL (e.g. http://localhost:3552/api)"
  )
  .option("-t, --token <token>", "Bearer token for authentication")
  .option(
    "-s, --sso-url <url>",
    "SSO Bridge URL for username/password or browser-based authentication"
  )
  .option(
    "-c, --client-id <id>",
    "OAuth client ID for the TUI",
    "adp-client-tui"
  )
  .option("--username <username>", "SSO Bridge username (prompted if omitted)")
  .option("--password <password>", "SSO Bridge password (prompted if omitted)")
  .action(async (opts) => {
    const config: AppConfig = {
      baseUrl: opts.url,
      token: opts.token,
      ssoUrl: opts.ssoUrl,
      clientId: opts.clientId,
      username: opts.username,
      password: opts.password
    };

    try {
      const app2 = withFullScreen(createElement(App, { config }));
      await app2.start();
      // await app2.instance.waitUntilExit();
      await app2.waitUntilExit();
      // const app = render(createElement(App, { config }));
      // await app.waitUntilExit();
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Fatal error: ${err.message}`);
        if (err.stack) console.error(err.stack);
      }
      process.exit(1);
    }
  });

program.parse();
