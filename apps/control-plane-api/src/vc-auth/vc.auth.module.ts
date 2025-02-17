import { Module } from "@nestjs/common";
import { VerifiablePresentationGuard } from "./verifiablePresentation.guard.js";
import { TransferVerifiablePresentationGuard } from "./transferVerifiablePresentation.guard.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VCAuthService } from "./vc.auth.service.js";
import { AuthModule } from "@tsg-dsp/common-api";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AgreementDao, TransferMonitorDao])
  ],
  providers: [
    VCAuthService,
    VerifiablePresentationGuard,
    TransferVerifiablePresentationGuard
  ],
  exports: [
    VCAuthService,
    VerifiablePresentationGuard,
    TransferVerifiablePresentationGuard
  ]
})
export class VCAuthModule {}
