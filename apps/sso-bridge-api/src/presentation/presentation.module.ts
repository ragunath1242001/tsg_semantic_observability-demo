import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OauthClient } from "../model/client.dao.js";
import { AuthorizationRequestDao } from "../model/oid4vp.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { OauthModule } from "../oauth/oauth.module.js";
import { PermissionsModule } from "../permissions/permissions.module.js";
import { UsersModule } from "../users/users.module.js";
import { OID4VPVerifierController } from "./oid4vp/verifier.controller.js";
import { OID4VPVerifierManagementController } from "./oid4vp/verifier.management.controller.js";
import { OID4VPVerifierService } from "./oid4vp/verifier.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([OauthUser, OauthClient, AuthorizationRequestDao]),
    UsersModule,
    OauthModule,
    PermissionsModule
  ],
  providers: [OID4VPVerifierService],
  controllers: [OID4VPVerifierController, OID4VPVerifierManagementController],
  exports: []
})
export class PresentationModule {}
