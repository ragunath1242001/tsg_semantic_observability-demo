import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { DspClientService } from "./client.service";
import { DspGateway } from "./dsp.gateway";

@Module({
  imports: [AuthModule],
  providers: [DspClientService, DspGateway],
  exports: [DspClientService, DspGateway]
})
export class DspClientModule {}
