import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './utils/logging';
import { ServerConfig } from './config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger()
  });
  const config = app.get(ServerConfig);
  if (process.env['EMBEDDED_FRONTEND'] || process.env['NODE_ENV'] !== "production") {
    app.setGlobalPrefix('api', {
      exclude: ['.well-known/did.json', 'health']
    })
  }
  Logger.log(`Listening on ${config.listen}:${config.port} with public address ${config.publicAddress}`, 'App')
  await app.listen(config.port, config.listen);
}
bootstrap();
