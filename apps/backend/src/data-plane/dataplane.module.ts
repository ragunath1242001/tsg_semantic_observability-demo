import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogModule } from "../dsp/catalog/catalog.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneDao } from "../model/data-planes/dataPlanes.dao";
import { DataplaneManagementController } from "./dataPlaneManagement.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    CatalogModule,
    TypeOrmModule.forFeature([DataPlaneDao]),
    AuthModule,
  ],
  controllers: [DataPlaneController, DataplaneManagementController],
  providers: [DataPlaneService],
  exports: [DataPlaneService],
})
export class DataPlaneModule {}
