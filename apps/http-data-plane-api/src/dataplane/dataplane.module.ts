import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataplane.service";
import { TransferDao } from "./transfer.dao";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao";
import { DataPlaneManagementController } from "./dataplane.management.controller";
import { ProxyController } from "./proxy.controller";
import { AuthModule } from "../auth/auth.module";
import { LoggingModule } from "../logging/logging.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao]),
    AuthModule,
    LoggingModule,
  ],
  controllers: [
    DataPlaneController,
    DataPlaneManagementController,
    ProxyController,
  ],
  providers: [DataPlaneService],
})
export class DataPlaneTestModule {}
