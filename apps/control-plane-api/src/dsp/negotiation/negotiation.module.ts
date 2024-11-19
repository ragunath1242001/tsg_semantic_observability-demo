import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { NegotiationService } from "./negotiation.service";
import { NegotiationController } from "./negotiation.controller";
import { NegotiationManagementController } from "./negotiationManagement.controller";
import { DspClientModule } from "../client/client.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../../model/negotiation.dao";
import { PolicyModule } from "../../policy/policy.module";
import { NegotiationListener } from "./negotiation.listeners";
import { TransferModule } from "../transfer/transfer.module";
import { CatalogModule } from "../catalog/catalog.module";

@Module({
  imports: [
    AuthModule,
    DspClientModule,
    CatalogModule,
    TransferModule,
    TypeOrmModule.forFeature([
      NegotiationDetailDao,
      NegotiationProcessEventDao
    ]),
    PolicyModule
  ],
  controllers: [NegotiationController, NegotiationManagementController],
  providers: [NegotiationService, NegotiationListener],
  exports: [NegotiationService]
})
export class NegotiationModule {}
