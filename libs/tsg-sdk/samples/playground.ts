/**
 * TSG SDK Interactive Playground
 *
 * Should be run via the zellij layout in sample/sdk/sdk.kdl.
 */
import * as readline from "node:readline";

import type { OfferDto } from "@tsg-dsp/common-dsp";
import { TsgSdk } from "@tsg-dsp/tsg-sdk";

// ── SDK Configuration ────────────────────────────────────────────────────
// In dev mode: control-plane and wallet have no /api prefix,
// but the SSO bridge always has /api.
const alfaSdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3501",
  walletBaseUrl: "http://localhost:3500",
  ssoBridgeBaseUrl: "http://localhost:3700/api",
  auth: {
    method: "client_secret_post",
    clientId: "sdk-client",
    clientSecret: "sdk-secret"
  }
});

const bravoSdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3601",
  walletBaseUrl: "http://localhost:3600",
  ssoBridgeBaseUrl: "http://localhost:3700/api",
  auth: {
    method: "client_secret_post",
    clientId: "sdk-client",
    clientSecret: "sdk-secret"
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────
const DIVIDER = "─".repeat(60);
const BLUE = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function header(text: string) {
  console.log(`\n${BLUE}${DIVIDER}${RESET}`);
  console.log(`${BLUE}  ${text}${RESET}`);
  console.log(`${BLUE}${DIVIDER}${RESET}\n`);
}

function success(text: string) {
  console.log(`${GREEN}✓${RESET} ${text}`);
}

function warn(text: string) {
  console.log(`${YELLOW}⚠${RESET} ${text}`);
}

function prettyJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2));
}

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.log(`${RED}✗ ${label} failed:${RESET} ${e.message ?? err}`);
    if (e.statusCode) console.log(`  ${DIM}Status:${RESET} ${e.statusCode}`);
    if (e.code) console.log(`  ${DIM}Code:${RESET} ${e.code}`);
    if (e.body)
      console.log(
        `  ${DIM}Body:${RESET}`,
        typeof e.body === "string" ? e.body : JSON.stringify(e.body, null, 2)
      );
    // Unwrap fetch cause chain (e.g. ECONNREFUSED)
    const cause = e.cause as Record<string, unknown> | undefined;
    if (cause) {
      console.log(
        `  ${DIM}Cause:${RESET} ${cause.message ?? cause.code ?? JSON.stringify(cause)}`
      );
      const inner = cause.cause as Record<string, unknown> | undefined;
      if (inner)
        console.log(
          `  ${DIM}  └─${RESET} ${inner.message ?? inner.code ?? JSON.stringify(inner)}`
        );
    }
    if (e.stack && !cause)
      console.log(
        `  ${DIM}${String(e.stack).split("\n").slice(0, 4).join("\n  ")}${RESET}`
      );
  }
}

// ── Menu actions ─────────────────────────────────────────────────────────
const actions: Record<string, { label: string; fn: () => Promise<void> }> = {
  // ── SSO ──
  "1": {
    label: "SSO: Get access token",
    fn: async () => {
      header("Acquiring access token via SSO Bridge");
      const token = await alfaSdk.sso.getAccessToken();
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      success(
        `Token: ${token.substring(0, 60)}...\nToken payload: ${JSON.stringify(payload, null, 2)}`
      );
    }
  },
  "2": {
    label: "SSO: OpenID configuration",
    fn: async () => {
      header("OpenID Connect Configuration");
      const config = await alfaSdk.sso.getOpenIdConfiguration();
      prettyJson(config);
    }
  },
  "3": {
    label: "SSO: List clients",
    fn: async () => {
      header("SSO Clients");
      const clients = await alfaSdk.sso.management.getClients();
      if (Array.isArray(clients)) {
        for (const c of clients) {
          console.log(`  • ${c.clientId ?? c.name ?? c}`);
        }
        success(`${clients.length} clients registered`);
      } else {
        prettyJson(clients);
      }
    }
  },
  "4": {
    label: "SSO: List users",
    fn: async () => {
      header("SSO Users");
      const users = await alfaSdk.sso.management.getUsers({
        page: 1,
        perPage: 50
      });
      if (Array.isArray(users)) {
        for (const u of users) {
          console.log(`  • ${u.username ?? u}`);
        }
        success(`${users.length} users`);
      } else {
        prettyJson(users);
      }
    }
  },

  // ── Catalog ──
  "5": {
    label: "Catalog: Get Alfa's own catalog",
    fn: async () => {
      header("Alfa's Catalog");
      const catalog = await alfaSdk.catalog.getOwnCatalog(true);
      prettyJson(catalog);
    }
  },
  "6": {
    label: "Catalog: Get Bravo's own catalog",
    fn: async () => {
      header("Bravo's Catalog");
      const catalog = await bravoSdk.catalog.getOwnCatalog(true);
      prettyJson(catalog);
    }
  },
  "7": {
    label: "Catalog: Discover registry participants (from Alfa)",
    fn: async () => {
      header("Registry Participants");
      await alfaSdk.catalog.refreshRegistry();
      const addresses = await alfaSdk.catalog.getRegistryAddresses();
      if (addresses.length === 0) {
        warn("No participants in registry yet");
      } else {
        for (const a of addresses) {
          console.log(`  • ${JSON.stringify(a)}`);
        }
        success(`${addresses.length} participants`);
      }
    }
  },
  "8": {
    label: "Catalog: Browse Bravo's catalog from Alfa",
    fn: async () => {
      header("Fetching Bravo's catalog via Alfa's control plane");
      const catalog = await alfaSdk.catalog.getParticipantCatalog(
        "did:web:localhost%3A3600",
        true
      );
      prettyJson(catalog);
    }
  },
  "9": {
    label: "Catalog: List Alfa's dataplanes",
    fn: async () => {
      header("Alfa's Dataplanes");
      const dps = await alfaSdk.catalog.getDataplanes();
      if (dps.length === 0) {
        warn("No dataplanes configured");
      } else {
        for (const dp of dps) console.log(`  • ${JSON.stringify(dp)}`);
      }
    }
  },

  // ── Wallet ──
  "10": {
    label: "Wallet: Get Alfa's DID document",
    fn: async () => {
      header("Alfa's DID Document");
      const did = await alfaSdk.wallet.getDidDocument();
      prettyJson(did);
    }
  },
  "11": {
    label: "Wallet: List Alfa's keys",
    fn: async () => {
      header("Alfa's Keys");
      const keys = await alfaSdk.wallet.listKeys();
      for (const k of keys) console.log(`  • ${JSON.stringify(k)}`);
      success(`${keys.length} keys`);
    }
  },
  "12": {
    label: "Wallet: List Alfa's credentials",
    fn: async () => {
      header("Alfa's Credentials");
      const creds = await alfaSdk.wallet.listCredentials();
      if (creds.length === 0) {
        warn("No credentials yet");
      } else {
        for (const c of creds) console.log(`  • ${JSON.stringify(c)}`);
      }
    }
  },
  "13": {
    label: "Wallet: List Alfa's dataspace credentials",
    fn: async () => {
      header("Alfa's Dataspace Credentials");
      const creds = await alfaSdk.wallet.listDataspaceCredentials();
      if (creds.length === 0) {
        warn("No dataspace credentials yet");
      } else {
        for (const c of creds) console.log(`  • ${JSON.stringify(c)}`);
      }
    }
  },
  "14": {
    label: "Wallet: Get Alfa's DID services",
    fn: async () => {
      header("Alfa's DID Services");
      const services = await alfaSdk.wallet.getDidServices();
      for (const s of services) prettyJson(s);
    }
  },
  "15": {
    label: "Wallet: Get Bravo's DID document",
    fn: async () => {
      header("Bravo's DID Document");
      const did = await bravoSdk.wallet.getDidDocument();
      prettyJson(did);
    }
  },

  // ── Negotiations ──
  "16": {
    label: "Negotiations: List Alfa's negotiations",
    fn: async () => {
      header("Alfa's Negotiations");
      const negs = await alfaSdk.negotiations.listNegotiations();
      if (negs.length === 0) {
        warn("No negotiations yet");
      } else {
        for (const n of negs) prettyJson(n);
      }
    }
  },
  "17": {
    label: "Negotiations: Request negotiation (Alfa → Bravo)",
    fn: async () => {
      header("Requesting negotiation from Alfa to Bravo");
      warn(
        "This requires Bravo to have a dataset. Fetching Bravo's catalog first..."
      );

      const catalog = await alfaSdk.catalog.getParticipantCatalog(
        "did:web:localhost%3A3600",
        true
      );

      const datasets = catalog.dataset ?? [];
      if (datasets.length === 0) {
        warn(
          "Bravo has no datasets. Add a dataset to Bravo's control plane first."
        );
        return;
      }

      const dataset = datasets[0];
      const datasetId = dataset["@id"];
      console.log(`Using dataset: ${datasetId}`);

      const offer: OfferDto = (dataset.hasPolicy?.[0] ??
        dataset["odrl:hasPolicy"]?.[0] ?? {
          "@type": "Offer",
          "@id": `offer-${Date.now()}`,
          target: datasetId,
          permission: [{ action: "use", constraint: [] }]
        }) as unknown as OfferDto;

      const neg = await alfaSdk.negotiations.requestNegotiation(
        datasetId,
        "did:web:localhost%3A3600",
        "http://localhost:3601",
        offer
      );
      success(`Negotiation created: ${JSON.stringify(neg)}`);
    }
  },

  // ── Transfers ──
  "18": {
    label: "Transfers: List Alfa's transfers",
    fn: async () => {
      header("Alfa's Transfers");
      const transfers = await alfaSdk.transfers.listTransfers();
      if (transfers.length === 0) {
        warn("No transfers yet");
      } else {
        for (const t of transfers) prettyJson(t);
      }
    }
  },

  // ── Full flow ──
  "19": {
    label: "Full flow: Negotiate + wait for agreement (Alfa → Bravo)",
    fn: async () => {
      header("Full Negotiation Flow: Alfa → Bravo");
      warn("This requires Bravo to have a dataset with a policy.");

      const catalog = await alfaSdk.catalog.getParticipantCatalog(
        "did:web:localhost%3A3600",
        true
      );

      const datasets = catalog.dataset ?? [];
      if (datasets.length === 0) {
        warn(
          "Bravo has no datasets. Add a dataset to Bravo's control plane first."
        );
        return;
      }

      const dataset = datasets[0];
      const datasetId = dataset["@id"];
      console.log(`Dataset: ${datasetId}`);

      const offer: OfferDto = (dataset.hasPolicy?.[0] ??
        dataset["odrl:hasPolicy"]?.[0] ?? {
          "@type": "Offer",
          "@id": `offer-${Date.now()}`,
          target: datasetId,
          permission: [{ action: "use", constraint: [] }]
        }) as unknown as OfferDto;

      console.log("Requesting negotiation...");
      const result = await alfaSdk.negotiations.negotiateAndWait(
        datasetId,
        "did:web:localhost%3A3600",
        "http://localhost:3601",
        offer,
        { intervalMs: 2000, maxRetries: 30 }
      );
      success("Negotiation completed!");
      prettyJson(result);
    }
  }
};

// ── Interactive menu ─────────────────────────────────────────────────────
function printMenu() {
  console.log(
    `\n${BLUE}╔══════════════════════════════════════════════════════════╗${RESET}`
  );
  console.log(
    `${BLUE}║           TSG SDK Interactive Playground                 ║${RESET}`
  );
  console.log(
    `${BLUE}╠══════════════════════════════════════════════════════════╣${RESET}`
  );
  console.log(
    `${BLUE}║${RESET}  Alfa  → :3501 (CP) :3500 (Wallet)                       ${BLUE}║${RESET}`
  );
  console.log(
    `${BLUE}║${RESET}  Bravo → :3601 (CP) :3600 (Wallet)                       ${BLUE}║${RESET}`
  );
  console.log(
    `${BLUE}║${RESET}  SSO   → :3700                                           ${BLUE}║${RESET}`
  );
  console.log(
    `${BLUE}╚══════════════════════════════════════════════════════════╝${RESET}\n`
  );

  console.log(`${DIM}── SSO ──${RESET}`);
  for (const [key, { label }] of Object.entries(actions).slice(0, 4)) {
    console.log(`  ${GREEN}${key.padStart(2)})${RESET} ${label}`);
  }
  console.log(`${DIM}── Catalog ──${RESET}`);
  for (const [key, { label }] of Object.entries(actions).slice(4, 9)) {
    console.log(`  ${GREEN}${key.padStart(2)})${RESET} ${label}`);
  }
  console.log(`${DIM}── Wallet ──${RESET}`);
  for (const [key, { label }] of Object.entries(actions).slice(9, 15)) {
    console.log(`  ${GREEN}${key.padStart(2)})${RESET} ${label}`);
  }
  console.log(`${DIM}── Negotiations ──${RESET}`);
  for (const [key, { label }] of Object.entries(actions).slice(15, 17)) {
    console.log(`  ${GREEN}${key.padStart(2)})${RESET} ${label}`);
  }
  console.log(`${DIM}── Transfers ──${RESET}`);
  for (const [key, { label }] of Object.entries(actions).slice(17, 18)) {
    console.log(`  ${GREEN}${key.padStart(2)})${RESET} ${label}`);
  }
  console.log(`${DIM}── Full flows ──${RESET}`);
  for (const [key, { label }] of Object.entries(actions).slice(18)) {
    console.log(`  ${GREEN}${key.padStart(2)})${RESET} ${label}`);
  }
  console.log(`\n  ${GREEN} m)${RESET} Show menu`);
  console.log(`  ${GREEN} q)${RESET} Quit\n`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () =>
    new Promise<string>((resolve) =>
      rl.question(`${YELLOW}▸${RESET} Choose an option: `, resolve)
    );

  printMenu();

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const choice = (await prompt()).trim();

    if (choice === "q" || choice === "quit" || choice === "exit") {
      console.log("Bye!");
      rl.close();
      process.exit(0);
    }

    if (choice === "m" || choice === "menu") {
      printMenu();
      continue;
    }

    const action = actions[choice];
    if (!action) {
      warn(`Unknown option "${choice}". Type 'm' for menu.`);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await safely(action.label, action.fn);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
