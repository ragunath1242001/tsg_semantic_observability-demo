import { CatalogService } from "@apps/control-plane-api";
import { INestApplication } from "@nestjs/common";
import axios from "axios";
import { existsSync, rmSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

export const setupConfigFile = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  if (existsSync(`${__dirname}/../e2e-local.db`)) {
    rmSync(`${__dirname}/../e2e-local.db`, {
      force: true
    });
  }
  process.env.CONFIG_PATH = `${__dirname}/../config.yaml`;
};

export const controlPlaneHealthy = async (
  port: number,
  app: INestApplication,
  timeout = 10000
) => {
  let started = false;
  for (const _i of [...Array(timeout / 100).keys()]) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await axios.get(`http://localhost:${port}/health`);
      if (result.status === 200) {
        started = true;
        break;
      }
    } catch (_e) {
      // ignore
    }
  }
  if (!started) {
    throw new Error("App did not start within 10 seconds");
  }
  await app.get(CatalogService).initialized;
};
