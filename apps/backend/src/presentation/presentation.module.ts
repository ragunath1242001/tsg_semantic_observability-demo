import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PresentationController } from "./presentation.controller.js";
import { PresentationService } from "./presentation.service.js";
import { CredentialsModule } from "../credentials/credentials.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { DidModule } from "../did/did.module.js";

@Module({
  imports: [AuthModule, CredentialsModule, KeysModule, DidModule],
  controllers: [PresentationController],
  providers: [PresentationService],
  exports: [PresentationService],
})
export class PresentationModule {}
