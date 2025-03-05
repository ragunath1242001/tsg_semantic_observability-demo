import { Module } from "@nestjs/common";
import { PresentationService } from "./presentation.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OauthUser } from "../model/user.dao.js";
import { OID4VPVerifierService } from "./oid4vp/verifier.service.js";
import { OID4VPVerifierController } from "./oid4vp/verifier.controller.js";
import { AuthorizationRequestDao } from "../model/oid4vp.dao.js";
import { UsersModule } from "../users/users.module.js";
import { OID4VPVerifierManagementController } from "./oid4vp/verifier.management.controller.js";
import { OauthModule } from "../oauth/oauth.module.js";

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
