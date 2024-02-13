import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { CredentialsModule } from "../credentials/credentials.module.js";
import { PresentationModule } from "../presentation/presentation.module.js";
import { IssuanceService } from "./issuance.service.js";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([CredentialIssuance, CIAccessToken]),
    CredentialsModule,
    PresentationModule
  ],
  providers: [
    IssuanceService
  ],
  exports: [
    IssuanceService
  ]
})
export class IssuanceModule {}