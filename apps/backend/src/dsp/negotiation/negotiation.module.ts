import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { NegotiationService } from "./negotiation.service";
import { NegotiationController } from "./negotiation.controller";
import { NegotiationManagementController } from "./negotiationManagement.controller";
import { DspClientModule } from "../client/client.module";


@Module({
  imports: [AuthModule, DspClientModule],
  controllers: [NegotiationController, NegotiationManagementController],
  providers: [NegotiationService],
  exports: [NegotiationService]
})
export class NegotiationModule {}