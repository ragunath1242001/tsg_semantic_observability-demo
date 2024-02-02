import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogModule } from "../dsp/catalog/catalog.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneDao } from "../model/data-planes/dataPlanes.dao";

@Module({
  imports: [CatalogModule, TypeOrmModule.forFeature([DataPlaneDao])],
  controllers: [DataPlaneController],
  providers: [DataPlaneService],
  exports: [DataPlaneService]
})
export class DataPlaneModule {}
