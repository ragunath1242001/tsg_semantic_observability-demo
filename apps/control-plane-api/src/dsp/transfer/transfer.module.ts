import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DataPlaneModule } from "../../data-plane/dataplane.module.js";
import {
  TransferDetailDao,
  TransferEventDao
} from "../../model/transfer.dao.js";
import { PolicyModule } from "../../policy/policy.module.js";
import { VCAuthModule } from "../../vc-auth/vc.auth.module.js";
import { DspClientModule } from "../client/client.module.js";
import { TransferController } from "./transfer.controller.js";
import { TransferService } from "./transfer.service.js";
import { TransferManagementController } from "./transferManagement.controller.js";

@Module({
  imports: [
    AuthModule,
    VCAuthModule,
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
