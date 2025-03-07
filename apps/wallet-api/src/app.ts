import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppLogger } from "@tsg-dsp/common-api";
import session from "express-session";

import { AppModule } from "./app.module.js";
import { RootConfig } from "./config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger()
  });
  const config = app.get(RootConfig);
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/*paths", "health", "{*jsonl}.jsonl"]
    });
  }
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
  await app.listen(config.server.port, config.server.listen);
}
bootstrap();
