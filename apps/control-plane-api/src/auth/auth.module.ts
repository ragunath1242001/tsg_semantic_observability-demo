import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import {
  TransferVerifiablePresentationGuard,
  VerifiablePresentationGuard
} from "./verifiablePresentation.guard.js";
import {
  TransferVerifiablePresentationStrategy,
  VerifiablePresentationStrategy
} from "./verifiablePresentation.strategy.js";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { config } from "../config.module.js";
import { OAuthStrategy } from "./oauth.strategy.js";
import { OAuthBearerStrategy } from "./oauth.bearer.strategy.js";
import { RolesGuard } from "./roles.guard.js";
import { OAuthGuard } from "./oauth.guard.js";
import { AuthClientService } from "./auth.client.service.js";
import { SessionSerializer } from "./session.serializer.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    PassportModule.register({ session: true }),
    TypeOrmModule.forFeature([AgreementDao, TransferMonitorDao])
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
    SessionSerializer
  ],
  exports: [
    AuthService,
    VerifiablePresentationGuard,
    TransferVerifiablePresentationGuard,
    OAuthGuard,
    RolesGuard,
    AuthClientService
  ]
})
export class AuthModule {}
