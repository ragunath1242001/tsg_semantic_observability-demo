import { INestApplication, Logger } from "@nestjs/common";
import session from "express-session";
import crypto from "crypto";
import { ServerConfig } from "@tsg-dsp/common-api";

export function setupApp(app: INestApplication) {
  const config = app.get(ServerConfig);
  if (
    process.env["EMBEDDED_FRONTEND"] ||
    process.env["NODE_ENV"] !== "production"
  ) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/did.json", "health"]
    });
  }
  app.use(
    session({
      name: "connect.sid.tsgcp",
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
