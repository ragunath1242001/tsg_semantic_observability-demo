import { Module } from "@nestjs/common";
import {
  TransferVerifiablePresentationGuard,
  VerifiablePresentationGuard
} from "./verifiablePresentation.guard.js";
import {
  TransferVerifiablePresentationStrategy,
  VerifiablePresentationStrategy
} from "./verifiablePresentation.strategy.js";
import { PassportModule } from "@nestjs/passport";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VCAuthService } from "./vc.auth.service.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    AuthModule.register(RootConfig),
    PassportModule.register({ session: true }),
    TypeOrmModule.forFeature([AgreementDao, TransferMonitorDao])
  ],
  providers: [
    VCAuthService,
    VerifiablePresentationGuard,
    VerifiablePresentationStrategy,
    TransferVerifiablePresentationGuard,
    TransferVerifiablePresentationStrategy
  ],
  exports: [
    VCAuthService,
    VerifiablePresentationGuard,
    TransferVerifiablePresentationGuard
  ]
})
export class VCAuthModule {}
