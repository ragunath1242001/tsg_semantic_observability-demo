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

@Module({
  imports: [
    AuthModule,
    DspClientModule,
    TypeOrmModule.forFeature([
      NegotiationDetailDao,
      NegotiationProcessEventDao
    ]),
    PolicyModule
  ],
  controllers: [NegotiationController, NegotiationManagementController],
  providers: [NegotiationService],
  exports: [NegotiationService]
})
export class NegotiationModule {}
