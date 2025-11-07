import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";
import {
  CommonDataPlaneModule,
  ITransferHandler,
  TransferController
} from "@tsg-dsp/common-data-plane-api";

import { AnalyticsTransferHandler } from "./analytics-transfer-handler.service.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { DataPlaneService } from "./dataplane.service.js";
import { DatasetDao } from "./dataset.dao.js";
import { TransferDao } from "./transfer.dao.js";
import { TransfersManagementController } from "./transfers.management.controller.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao, DatasetDao]),
    AuthModule,
    CommonDataPlaneModule
  ],
  controllers: [
    DataPlaneController,
    DataPlaneManagementController,
    TransferController,
    TransfersManagementController
  ],
  providers: [
    DataPlaneService,
    {
      provide: ITransferHandler,
      useClass: AnalyticsTransferHandler
    }
  ],
  exports: [
    DataPlaneService,
    {
      provide: ITransferHandler,
      useClass: AnalyticsTransferHandler
    }
  ]
})
export class DataPlaneModule {}
