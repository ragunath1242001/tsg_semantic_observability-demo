import { INestApplication, Logger } from "@nestjs/common";
import { ServerConfig } from "@tsg-dsp/common-api";

export function setupApp(app: INestApplication) {
  const config = app.get(ServerConfig);
  if (
    process.env["EMBEDDED_FRONTEND"] ||
    process.env["NODE_ENV"] !== "production"
  ) {
    app.setGlobalPrefix(`${process.env["SUBPATH"] ?? ""}/api`, {
      exclude: [".well-known/openid-configuration", "health"]
    });
  }
  Logger.log(
    `Listening on ${config.listen}:${config.port} with public address ${config.publicAddress}`,
    "App"
  );
  return config;
}
