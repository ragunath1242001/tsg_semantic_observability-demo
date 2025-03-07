import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { TransferVerifiablePresentationGuard } from "./transferVerifiablePresentation.guard.js";
import { VCAuthService } from "./vc.auth.service.js";
import { VerifiablePresentationGuard } from "./verifiablePresentation.guard.js";

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
