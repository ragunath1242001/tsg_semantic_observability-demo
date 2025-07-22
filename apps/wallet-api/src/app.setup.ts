import { INestApplication, Logger } from "@nestjs/common";
import crypto from "crypto";
import express from "express";
import session from "express-session";

import { RootConfig } from "./config.js";

export function setupApp(app: INestApplication) {
  const config = app.get(RootConfig);
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/*paths", "health", "{*jsonl}.jsonl"]
    });
  }

  app.use(
    express.urlencoded({
      extended: true,
      limit: "10mb"
    })
  );

  Logger.debug(
    `Starting with the following context:\n${JSON.stringify(config, null, 2)}`,
    "Bootstrap"
  );
  app.use(
    session({
      name: "connect.sid.tsgw",
      secret: process.env["SESSION_SECRET"] || crypto.randomUUID(),
      resave: false,
      saveUninitialized: false
    })
  );
  app.enableCors({
    allowedHeaders: "*",
    origin: "*"
  });
  return config;
}
