import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  TransferVerifiablePresentationGuard,
  VerifiablePresentationGuard,
} from "./verifiablePresentation.guard";
import {
  TransferVerifiablePresentationStrategy,
  VerifiablePresentationStrategy,
} from "./verifiablePresentation.strategy";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { config } from "../config.module";
import { OAuthStrategy } from "./oauth.strategy";
import { OAuthBearerStrategy } from "./oauth.bearer.strategy";
import { RolesGuard } from "./roles.guard";
import { OAuthGuard } from "./oauth.guard";
import { AuthClientService } from "./auth.client.service";
import { SessionSerializer } from "./session.serializer";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    PassportModule.register({ session: true }),
    TypeOrmModule.forFeature([AgreementDao, TransferMonitorDao]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    VerifiablePresentationGuard,
    VerifiablePresentationStrategy,
    TransferVerifiablePresentationGuard,
    TransferVerifiablePresentationStrategy,
    ...(config.auth.enabled ? [OAuthStrategy, OAuthBearerStrategy] : []),
    OAuthGuard,
    RolesGuard,
    AuthClientService,
    SessionSerializer,
  ],
  exports: [
    AuthService,
    VerifiablePresentationGuard,
    TransferVerifiablePresentationGuard,
    OAuthGuard,
    RolesGuard,
    AuthClientService,
  ],
})
export class AuthModule {}
