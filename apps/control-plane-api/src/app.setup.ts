import { INestApplication, Logger } from "@nestjs/common";
import { ServerConfig } from "@tsg-dsp/common-api";
import crypto from "crypto";
import { json, urlencoded } from "express";
import session from "express-session";

export function setupApp(app: INestApplication) {
  const config = app.get(ServerConfig);
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/dspace-version", "health"]
    });
  }
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  app.use(
    session({
      name: process.env["SESSION_NAME"] || "connect.sid.tsgcp",
      secret: process.env["SESSION_SECRET"] || crypto.randomUUID(),
      resave: false,
      saveUninitialized: false
    })
  );
  Logger.log(
    `Listening on ${config.listen}:${config.port} with public address ${config.publicAddress}`,
    "App"
  );
  return config;
}
