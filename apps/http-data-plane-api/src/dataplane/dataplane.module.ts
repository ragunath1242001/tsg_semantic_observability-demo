import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { LoggingModule } from "../logging/logging.module.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneStateDao, DatasetItemDao } from "./dataplane.dao.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { DataPlaneService } from "./dataplane.service.js";

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
