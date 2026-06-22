import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";
import {
  CommonDataPlaneModule,
  ITransferHandler,
  TransferController
} from "@tsg-dsp/common-data-plane-api";

import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { LoggingModule } from "../logging/logging.module.js";
import { SemanticObservabilityModule } from "../semantic-observability/semantic-observability.module.js";
import { HTTPTransferHandler } from "./http-transfer-handler.service.js";
import { ProxyController } from "./proxy.controller.js";
import { TransferDao } from "./transfer.dao.js";
import { TransferManagementController } from "./transfer.management.controller.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao]),
    AuthModule,
    LoggingModule,
    SemanticObservabilityModule,
    DataPlaneModule,
    CommonDataPlaneModule
  ],
  controllers: [
    TransferManagementController,
    ProxyController,
    TransferController
  ],
  providers: [
    {
      provide: ITransferHandler,
      useClass: HTTPTransferHandler
    }
  ]
})
export class TransferModule {}
