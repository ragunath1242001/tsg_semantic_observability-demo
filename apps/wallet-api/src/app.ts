import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { AppLogger } from "./utils/logging.js";
import { RootConfig } from "./config.js";
import { Logger } from "@nestjs/common";
import session from "express-session";
import passport from "passport";

async function bootstrap() {
  const logLevelConfig =
    process.env["LOG_LEVEL"]?.toLowerCase() ||
    (process.env.NODE_ENV === "production" ? "info" : "debug");
  let logLevel: "log" | "debug" | "verbose";
  switch (logLevelConfig) {
    case "info":
    case "log":
      logLevel = "log";
      break;
    case "debug":
      logLevel = "debug";
      break;
    case "verbose":
      logLevel = "verbose";
      break;
    default:
      logLevel = "debug";
  }
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(logLevel),
  });
  const config = app.get(RootConfig);
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/(.*)", "health"],
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
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.enableCors({
    allowedHeaders: "*",
    origin: "*",
  });
  await app.listen(config.server.port, config.server.listen);
}
bootstrap();
