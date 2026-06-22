import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import {
  NegotiationDetailDao,
  NegotiationProcessEventDao
} from "../../model/negotiation.dao.js";
import { PolicyModule } from "../../policy/policy.module.js";
import { SemanticObservabilityModule } from "../../semantic-observability/semantic-observability.module.js";
import { VCAuthModule } from "../../vc-auth/vc.auth.module.js";
import { CatalogModule } from "../catalog/catalog.module.js";
import { DspClientModule } from "../client/client.module.js";
import { TransferModule } from "../transfer/transfer.module.js";
import { NegotiationController } from "./negotiation.controller.js";
import { NegotiationListener } from "./negotiation.listeners.js";
import { NegotiationService } from "./negotiation.service.js";
import { NegotiationManagementController } from "./negotiationManagement.controller.js";

@Module({
  imports: [
    AuthModule,
    VCAuthModule,
    DspClientModule,
    CatalogModule,
    TransferModule,
    SemanticObservabilityModule,
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
