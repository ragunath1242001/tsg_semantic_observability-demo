import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppLogger, ServerConfig } from "@tsg-dsp/common-api";
import crypto from "crypto";
import { json, urlencoded } from "express";
import session from "express-session";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new AppLogger()
  });

  const config = app.get(ServerConfig);
  Logger.log(
    `Listening on ${config.listen}:${config.port} with public address ${config.publicAddress}`,
    "App"
  );
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: ["health", "api/health"]
    });
  }
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  app.use(
    session({
      name: process.env["SESSION_NAME"] || "connect.sid.tsgadp",
      secret: process.env["SESSION_SECRET"] || crypto.randomUUID(),
      resave: false,
      saveUninitialized: false
    })
  );
  app.enableCors({
    allowedHeaders: "*",
    origin: "*"
  });

  await app.listen(config.port, config.listen);
}
bootstrap();
