import { Module } from "@nestjs/common";

import { AbacGuard } from "./abac/abac.guard.js";
import { AuthClientService } from "./auth.client.service.js";
import { AuthController } from "./auth.controller.js";
import { OAuthGuard } from "./oauth.guard.js";
import { OAuthService } from "./oauth.service.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";
import { WsAuthMiddleware } from "./ws-auth.middleware.js";

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthClientService,
    OpenIDConfigurationService,
    OAuthService,
    OAuthGuard.asGlobalGuard(),
    AbacGuard.asGlobalGuard(),
    WsAuthMiddleware
  ],
  exports: [
    AuthClientService,
    OpenIDConfigurationService,
    OAuthService,
    WsAuthMiddleware
  ]
})
export class AuthModule {}
