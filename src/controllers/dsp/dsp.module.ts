import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from '../../services/catalog.service';
// import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class DspModule {}
