import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule, EmailModule } from "@tsg-dsp/common-api";

import { ContextModule } from "../contexts/context.module.js";
import { CredentialsModule } from "../credentials/credentials.module.js";
import { DidModule } from "../did/did.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { PresentationModule } from "../presentation/presentation.module.js";
import { HolderController } from "./holder.controller.js";
import { HolderService } from "./holder.service.js";
import { IssuerController } from "./issuer.controller.js";
import { IssuerService } from "./issuer.service.js";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([CredentialIssuance, CIAccessToken]),
    ContextModule,
    CredentialsModule,
    DidModule,
    EmailModule,
    KeysModule,
    PresentationModule
  ],
  controllers: [HolderController, IssuerController],
  providers: [IssuerService, HolderService],
  exports: [IssuerService, HolderService]
})
export class IssuanceModule {}
