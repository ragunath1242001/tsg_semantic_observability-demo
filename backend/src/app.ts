import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppLogger } from './utils/logging.js';
import { ServerConfig } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger()
  });
  const config = app.get(ServerConfig);
  console.log(JSON.stringify(config));
  await app.listen(config.port, config.listen);
}
bootstrap();
