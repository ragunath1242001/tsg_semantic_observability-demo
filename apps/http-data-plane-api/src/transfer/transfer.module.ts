import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { LoggingModule } from "../logging/logging.module.js";
import { ProxyController } from "./proxy.controller.js";
import { TransferController } from "./transfer.controller.js";
import { TransferDao } from "./transfer.dao.js";
import { TransferManagementController } from "./transfer.management.controller.js";
import { TransferService } from "./transfer.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao]),
    AuthModule,
    LoggingModule,
    DataPlaneModule
  ],
  controllers: [
    TransferController,
    TransferManagementController,
    ProxyController
  ],
  providers: [TransferService]
})
export class TransferModule {}
