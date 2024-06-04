import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { VerifiablePresentationGuard } from "./verifiablePresentation.guard";
import { VerifiablePresentationStrategy } from "./verifiablePresentation.strategy";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { config } from "../config.module";
import { OAuthStrategy } from "./oauth.strategy";
import { OAuthBearerStrategy } from "./oauth.bearer.strategy";
import { RolesGuard } from "./roles.guard";
import { OAuthGuard } from "./oauth.guard";
import { AuthClientService } from "./auth.client.service";
import { SessionSerializer } from "./session.serializer";

@Module({
  imports: [PassportModule.register({ session: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    VerifiablePresentationGuard,
    VerifiablePresentationStrategy,
    ...(config.auth.enabled ? [OAuthStrategy, OAuthBearerStrategy] : []),
    OAuthGuard,
    RolesGuard,
    AuthClientService,
    SessionSerializer,
  ],
  exports: [
    AuthService,
    VerifiablePresentationGuard,
    OAuthGuard,
    RolesGuard,
    AuthClientService,
  ],
})
export class AuthModule {}
