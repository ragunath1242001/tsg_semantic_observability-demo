import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { AppLogger } from "./utils/logging.js";
import { setupApp } from "./app.setup.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger()
  });
  const config = setupApp(app);

  await app.listen(config.port, config.listen);
}
bootstrap();
