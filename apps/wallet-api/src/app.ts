import { NestFactory } from "@nestjs/core";
import { AppLogger } from "@tsg-dsp/common-api";

import { AppModule } from "./app.module.js";
import { setupApp } from "./index.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger()
  });
  const config = setupApp(app);
  await app.listen(config.server.port, config.server.listen);
}
bootstrap();
