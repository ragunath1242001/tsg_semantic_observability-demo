import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { CredentialsModule } from "../credentials/credentials.module.js";
import { PresentationModule } from "../presentation/presentation.module.js";
import { IssuerService } from "./issuer.service.js";
import { DidModule } from "../did/did.module.js";
import { HolderService } from "./holder.service.js";
import { KeysModule } from "../keys/keys.module.js";
import { HolderController } from "./holder.controller.js";
import { IssuerController } from "./issuer.controller.js";
import { ContextModule } from "../contexts/context.module.js";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([CredentialIssuance, CIAccessToken]),
    ContextModule,
    CredentialsModule,
    DidModule,
    KeysModule,
    PresentationModule
  ],
  controllers: [HolderController, IssuerController],
  providers: [IssuerService, HolderService],
  exports: [IssuerService, HolderService]
})
export class IssuanceModule {}
