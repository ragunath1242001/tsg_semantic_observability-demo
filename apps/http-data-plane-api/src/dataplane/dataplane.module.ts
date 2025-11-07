import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";
import { CommonDataPlaneModule } from "@tsg-dsp/common-data-plane-api";

import { LoggingModule } from "../logging/logging.module.js";
import { DataPlaneController } from "./dataplane.controller.js";
import {
  DatasetItemDao,
  HttpDatasetConfigDao,
  VersionedDatasetDao
} from "./dataplane.dao.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { DataPlaneService } from "./dataplane.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HttpDatasetConfigDao,
      DatasetItemDao,
      VersionedDatasetDao
    ]),
    AuthModule,
    LoggingModule,
    CommonDataPlaneModule
  ],
  controllers: [DataPlaneController, DataPlaneManagementController],
  providers: [DataPlaneService],
  exports: [DataPlaneService]
})
export class DataPlaneModule {}
