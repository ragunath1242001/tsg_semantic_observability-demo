import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ServerConfig } from "./config";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ServerConfig);
  Logger.log(
    `Listening on ${config.listen}:${config.port} with public address ${config.publicAddress}`,
    "App",
  );
  if (process.env["EMBEDDED_FRONTEND"]) {
    app.setGlobalPrefix("api", {
      exclude: ["health", "api/health"],
    });
  }
  await app.listen(config.port, config.listen);
}
bootstrap();
