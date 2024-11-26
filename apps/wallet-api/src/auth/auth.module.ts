import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { OAuthBearerStrategy } from "./oauth.bearer.strategy.js";
import { OAuthStrategy } from "./oauth.strategy.js";
import { SessionSerializer } from "./session.serializer.js";
import { OAuthGuard } from "./oauth.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { config } from "../config.module.js";
import { AuthClientService } from "./auth.client.service.js";

@Module({
  imports: [PassportModule.register({ session: true })],
  controllers: [AuthController],
  providers: [
    ...(config.auth.enabled ? [OAuthStrategy, OAuthBearerStrategy] : []),
    AuthClientService,
    SessionSerializer,
    OAuthGuard.asGlobalGuard(),
    RolesGuard.asGlobalGuard()
  ],
  exports: [AuthClientService]
})
export class AuthModule {}
