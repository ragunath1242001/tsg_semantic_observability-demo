import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  AppLogger,
  ServerConfig,
  SESSION_MIDDLEWARE
} from "@tsg-dsp/common-api";
import { json, urlencoded } from "express";

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
  app.use(app.get(SESSION_MIDDLEWARE));
  app.enableCors({
    allowedHeaders: "*",
    origin: "*"
  });

  await app.listen(config.port, config.listen);
}
bootstrap();
