import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataplane.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao, DatasetItemDao } from "./dataplane.dao.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { LoggingModule } from "../logging/logging.module.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([DataPlaneStateDao, DatasetItemDao]),
    AuthModule,
    LoggingModule
  ],
  controllers: [DataPlaneController, DataPlaneManagementController],
  providers: [DataPlaneService],
  exports: [DataPlaneService]
})
export class DataPlaneModule {}
