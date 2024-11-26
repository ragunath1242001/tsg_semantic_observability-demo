import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { OAuthBearerStrategy } from "./oauth.bearer.strategy";
import { OAuthStrategy } from "./oauth.strategy";
import { SessionSerializer } from "./session.serializer";
import { OAuthGuard } from "./oauth.guard";
import { RolesGuard } from "./roles.guard";
import { config } from "../config.module";
import { AuthClientService } from "./auth.client.service";

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
