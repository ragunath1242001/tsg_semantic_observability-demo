import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { NegotiationService } from "./negotiation.service";
import { NegotiationController } from "./negotiation.controller";
import { NegotiationManagementController } from "./negotiationManagement.controller";
import { DspClientModule } from "../client/client.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NegotiationDetailDao, NegotiationProcessEventDao } from "../../model/dsp/negotiation/negotiation.dao";
import { NegotiationGateway } from "./negotiation.gateway";


@Module({
  imports: [AuthModule, DspClientModule, TypeOrmModule.forFeature([NegotiationDetailDao, NegotiationProcessEventDao])],
  controllers: [NegotiationController, NegotiationManagementController],
  providers: [NegotiationService, NegotiationGateway],
  exports: [NegotiationService]
})
export class NegotiationModule {}