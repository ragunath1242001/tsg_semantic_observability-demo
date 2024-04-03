import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataplane.service";
import { TransferDao } from "./transfer.dao";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao";
import { DataPlaneManagementController } from "./dataplane.management.controller";
import { ProxyController } from "./proxy.controller";

@Module({
  imports: [TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao])],
  controllers: [
    DataPlaneController,
    DataPlaneManagementController,
    ProxyController,
  ],
  providers: [DataPlaneService],
})
export class DataPlaneTestModule {}
