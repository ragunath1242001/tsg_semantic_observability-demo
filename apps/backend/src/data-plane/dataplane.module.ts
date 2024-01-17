import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogModule } from "../dsp/catalog/catalog.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneDetailsDao, DataPlaneStatusDao } from "../model/data-planes/dataPlanes.dao";

@Module({
  imports: [CatalogModule, TypeOrmModule.forFeature([DataPlaneStatusDao, DataPlaneDetailsDao])],
  controllers: [DataPlaneController],
  providers: [DataPlaneService],
  exports: [DataPlaneService]
})
export class DataPlaneModule {}
