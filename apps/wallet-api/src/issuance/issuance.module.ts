import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule, EmailModule } from "@tsg-dsp/common-api";

import { CredentialsModule } from "../credentials/credentials.module.js";
import { DidModule } from "../did/did.module.js";
import { IssueConfigurationModule } from "../issue-configurations/issue-configuration.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao.js";
import { PresentationModule } from "../presentation/presentation.module.js";
import { DCPHolderController } from "./dcp/holder.controller.js";
import { DCPHolderService } from "./dcp/holder.service.js";
import { DCPIssuerController } from "./dcp/issuer.controller.js";
import { DCPIssuerService } from "./dcp/issuer.service.js";
import { IssuanceManagementController } from "./issuance.management.controller.js";
import { IssuanceService } from "./issuance.service.js";
import { OID4VCIHolderController } from "./oid4vci/holder.controller.js";
import { OID4VCIHolderService } from "./oid4vci/holder.service.js";
import { OID4VCIIssuerController } from "./oid4vci/issuer.controller.js";
import { OID4VCIIssuerService } from "./oid4vci/issuer.service.js";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([CredentialIssuance, CIAccessToken]),
    IssueConfigurationModule,
    CredentialsModule,
    DidModule,
    EmailModule,
    KeysModule,
    PresentationModule
  ],
  controllers: [
    IssuanceManagementController,
    DCPHolderController,
    DCPIssuerController,
    OID4VCIHolderController,
    OID4VCIIssuerController
  ],
  providers: [
    IssuanceService,
    DCPIssuerService,
    DCPHolderService,
    OID4VCIIssuerService,
    OID4VCIHolderService
  ],
  exports: [
    IssuanceService,
    DCPIssuerService,
    DCPHolderService,
    OID4VCIIssuerService,
    OID4VCIHolderService
  ]
})
export class IssuanceModule {}
