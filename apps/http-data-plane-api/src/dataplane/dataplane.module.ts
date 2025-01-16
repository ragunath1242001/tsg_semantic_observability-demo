import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataplane.service.js";
import { TransferDao } from "./transfer.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { ProxyController } from "./proxy.controller.js";
import { LoggingModule } from "../logging/logging.module.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao]),
    AuthModule.register(RootConfig),
    LoggingModule
  ],
  controllers: [
    DataPlaneController,
    DataPlaneManagementController,
    ProxyController
  ],
  providers: [DataPlaneService]
})
export class DataPlaneTestModule {}
