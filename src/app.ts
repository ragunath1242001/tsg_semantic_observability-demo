import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './utils/logging';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger()
  });
  await app.listen(3000);
}
bootstrap();
