import { Module } from "@nestjs/common";
import { VCAuthModule } from "../../vc-auth/vc.auth.module.js";
import { DspClientService } from "./client.service.js";
import { DspGateway } from "./dsp.gateway.js";
import { AuthModule } from "@tsg-dsp/common-api";

@Module({
  imports: [AuthModule, VCAuthModule],
  providers: [DspClientService, DspGateway],
  exports: [DspClientService, DspGateway]
})
export class DspClientModule {}
