import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataplane.service.js";
import { TransferDao } from "./transfer.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { DataPlaneManagementController } from "./dataplane.management.controller.js";
import { AuthModule } from "../auth/auth.module.js";
import { LoggingModule } from "../logging/logging.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao]),
    AuthModule,
    LoggingModule
  ],
  controllers: [DataPlaneController, DataPlaneManagementController],
  providers: [DataPlaneService]
})
export class DataPlaneTestModule {}
