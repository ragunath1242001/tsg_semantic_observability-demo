import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { DspClientService } from "./client.service";

@Module({
  imports: [
    AuthModule
  ],
  providers: [
    DspClientService
  ],
  exports: [
    DspClientService
  ]
})
export class DspClientModule {}