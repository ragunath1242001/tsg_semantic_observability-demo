import { NestFactory } from '@nestjs/core';
import { DspModule } from './controllers/dsp/dsp.module';

async function bootstrap() {
  const app = await NestFactory.create(DspModule);
  await app.listen(3000);
}
bootstrap();
