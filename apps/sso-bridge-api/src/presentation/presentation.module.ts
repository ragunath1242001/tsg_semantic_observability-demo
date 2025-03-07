import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthorizationRequestDao } from "../model/oid4vp.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { OauthModule } from "../oauth/oauth.module.js";
import { UsersModule } from "../users/users.module.js";
import { OID4VPVerifierController } from "./oid4vp/verifier.controller.js";
import { OID4VPVerifierManagementController } from "./oid4vp/verifier.management.controller.js";
import { OID4VPVerifierService } from "./oid4vp/verifier.service.js";
import { PresentationService } from "./presentation.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([OauthUser, AuthorizationRequestDao]),
    UsersModule,
    OauthModule
  ],
  providers: [PresentationService, OID4VPVerifierService],
  controllers: [OID4VPVerifierController, OID4VPVerifierManagementController],
  exports: [PresentationService]
})
export class PresentationModule {}
