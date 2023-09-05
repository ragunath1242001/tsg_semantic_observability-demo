import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ServerConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ServerConfig);
  console.log(JSON.stringify(config));
  await app.listen(config.port, config.listen);
}
bootstrap();
