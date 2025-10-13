import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { CredentialsModule } from "../credentials/credentials.module.js";
import { DidModule } from "../did/did.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { SecureTokenService } from "../keys/token.service.js";
import { SIToken } from "../model/dcp.dao.js";
import { AuthorizationRequestDao } from "../model/presentation.dao.js";
import { ScopeDao } from "../model/scopes.dao.js";
import { DCPHolderController } from "./dcp/holder.controller.js";
import { DCPHolderManagementController } from "./dcp/holder.management.controller.js";
import { DCPHolderService } from "./dcp/holder.service.js";
import { DCPVerifierManagementController } from "./dcp/verifier.management.controller.js";
import { DCPVerifierService } from "./dcp/verifier.service.js";
import { OID4VPVerifierController } from "./oid4vp/verifier.controller.js";
import { OID4VPVerifierManagementController } from "./oid4vp/verifier.management.controller.js";
import { OID4VPVerifierService } from "./oid4vp/verifier.service.js";
import { PresentationManagementController } from "./presentation.management.controller.js";
import { PresentationService } from "./presentation.service.js";

@Module({
  imports: [
    AuthModule,
    CredentialsModule,
    KeysModule,
    DidModule,
    TypeOrmModule.forFeature([SIToken, AuthorizationRequestDao, ScopeDao])
  ],
  controllers: [
    PresentationManagementController,
    DCPHolderController,
    DCPHolderManagementController,
    DCPVerifierManagementController,
    OID4VPVerifierController,
    OID4VPVerifierManagementController
  ],
  providers: [
    PresentationService,
    OID4VPVerifierService,
    SecureTokenService,
    DCPHolderService,
    DCPVerifierService
  ],
  exports: [
    PresentationService,
    SecureTokenService,
    DCPHolderService,
    DCPVerifierService
  ]
})
export class PresentationModule {}
