import { Module } from "@nestjs/common";
import { TransferDao } from "./transfer.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProxyController } from "./proxy.controller.js";
import { LoggingModule } from "../logging/logging.module.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";
import { TransferController } from "./transfer.controller.js";
import { TransferManagementController } from "./transfer.management.controller.js";
import { TransferService } from "./transfer.service.js";
import { DataPlaneModule } from "../dataplane/dataplane.module.js";

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
