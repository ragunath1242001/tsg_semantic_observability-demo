import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module.js";
import { DspClientService } from "./client.service.js";
import { DspGateway } from "./dsp.gateway.js";

@Module({
  imports: [AuthModule],
  providers: [DspClientService, DspGateway],
  exports: [DspClientService, DspGateway]
})
export class DspClientModule {}
