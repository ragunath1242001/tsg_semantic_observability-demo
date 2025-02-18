import { Module } from "@nestjs/common";
import { VCAuthModule } from "../../vc-auth/vc.auth.module.js";
import { NegotiationService } from "./negotiation.service.js";
import { NegotiationController } from "./negotiation.controller.js";
import { NegotiationManagementController } from "./negotiationManagement.controller.js";
import { DspClientModule } from "../client/client.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../../model/negotiation.dao.js";
import { PolicyModule } from "../../policy/policy.module.js";
import { NegotiationListener } from "./negotiation.listeners.js";
import { TransferModule } from "../transfer/transfer.module.js";
import { CatalogModule } from "../catalog/catalog.module.js";
import { AuthModule } from "@tsg-dsp/common-api";

@Module({
  imports: [
    AuthModule,
    VCAuthModule,
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
