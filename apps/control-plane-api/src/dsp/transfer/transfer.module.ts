import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { DspClientModule } from "../client/client.module";
import { DataPlaneModule } from "../../data-plane/dataplane.module";
import { TransferService } from "./transfer.service";
import { TransferController } from "./transfer.controller";
import { TransferManagementController } from "./transferManagement.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransferDetailDao, TransferEventDao } from "../../model/transfer.dao";
import { PolicyModule } from "../../policy/policy.module";

@Module({
  imports: [
    AuthModule,
    DspClientModule,
    forwardRef(() => DataPlaneModule),
    TypeOrmModule.forFeature([TransferDetailDao, TransferEventDao]),
    forwardRef(() => PolicyModule),
  ],
  controllers: [TransferController, TransferManagementController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
