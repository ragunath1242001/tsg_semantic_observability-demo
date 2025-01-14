import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module.js";
import { DspClientModule } from "../client/client.module.js";
import { DataPlaneModule } from "../../data-plane/dataplane.module.js";
import { TransferService } from "./transfer.service.js";
import { TransferController } from "./transfer.controller.js";
import { TransferManagementController } from "./transferManagement.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  TransferDetailDao,
  TransferEventDao
} from "../../model/transfer.dao.js";
import { PolicyModule } from "../../policy/policy.module.js";

@Module({
  imports: [
    AuthModule,
    DspClientModule,
    forwardRef(() => DataPlaneModule),
    TypeOrmModule.forFeature([TransferDetailDao, TransferEventDao]),
    forwardRef(() => PolicyModule)
  ],
  controllers: [TransferController, TransferManagementController],
  providers: [TransferService],
  exports: [TransferService]
})
export class TransferModule {}
