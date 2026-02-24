import { INestApplication, Logger } from "@nestjs/common";
import { ServerConfig, SESSION_MIDDLEWARE } from "@tsg-dsp/common-api";
import { json, urlencoded } from "express";

export function setupApp(app: INestApplication) {
  const config = app.get(ServerConfig);
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/dspace-version", "health"]
    });
  }
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  app.use(app.get(SESSION_MIDDLEWARE));
  Logger.log(
    `Listening on ${config.listen}:${config.port} with public address ${config.publicAddress}`,
    "App"
  );
  return config;
}
