import { Module } from "@nestjs/common";

import { AuthClientService } from "./auth.client.service.js";
import { AuthController } from "./auth.controller.js";
import { OAuthGuard } from "./oauth.guard.js";
import { OAuthService } from "./oauth.service.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";
import { RolesGuard } from "./roles.guard.js";

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthClientService,
    OpenIDConfigurationService,
    OAuthService,
    OAuthGuard.asGlobalGuard(),
    RolesGuard.asGlobalGuard()
  ],
  exports: [AuthClientService, OpenIDConfigurationService, OAuthService]
})
export class AuthModule {}
