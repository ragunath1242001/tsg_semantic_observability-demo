import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { DataPlaneService } from "./dataplane.service.js";
import { DatasetDao } from "./dataset.dao.js";
import { ManagementClient } from "./management-client.service.js";
import { TransferDao } from "./transfer.dao.js";
import { TransfersController } from "./transfers.controller.js";
import { TransfersManagementController } from "./transfers.management.controller.js";
import { TransfersService } from "./transfers.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao, DatasetDao]),
    AuthModule
  ],
  controllers: [
    DataPlaneController,
    DataPlaneManagementController,
    TransfersController,
    TransfersManagementController
  ],
  providers: [DataPlaneService, TransfersService, ManagementClient],
  exports: [DataPlaneService, TransfersService, ManagementClient]
})
export class DataPlaneModule {}
