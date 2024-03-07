import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { DspClientModule } from "../client/client.module";
import { DataPlaneModule } from "../../data-plane/dataplane.module";
import { TransferService } from "./transfer.service";
import { TransferController } from "./transfer.controller";
import { TransferManagementController } from "./transferManagement.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  TransferDetailDao,
  TransferEventDao,
} from "../../model/dsp/transfer/transfer.dao";

@Module({
  imports: [
    AuthModule,
    DspClientModule,
    DataPlaneModule,
    TypeOrmModule.forFeature([TransferDetailDao, TransferEventDao]),
  ],
  controllers: [TransferController, TransferManagementController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
