import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { Logger } from "@nestjs/common";
import session from "express-session";
import passport from "passport";
import crypto from "crypto";
import { ServerConfig } from "@tsg-dsp/common-api";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true
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
  app.use(
    session({
      name: "connect.sid.tsgadp",
      secret: process.env["SESSION_SECRET"] || crypto.randomUUID(),
      resave: false,
      saveUninitialized: false
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.enableCors({
    allowedHeaders: "*",
    origin: "*"
  });
  await app.listen(config.port, config.listen);
}
bootstrap();
