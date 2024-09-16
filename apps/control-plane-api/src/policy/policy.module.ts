import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../dsp/catalog/catalog.module";
import { AgreementManagementController } from "./agreement.management.controller";
import { AgreementService } from "./agreement.service";
import { PolicyEvaluationController } from "./policy.evaluation.controller";
import { PolicyEvaluationService } from "./policy.evaluation.service";
import { ConstraintDao, RuleDao } from "../model/rule.dao";
import { RuleRepositoryController } from "./rule.repository.controller";
import { RuleRepositoryService } from "./rule.repository.service";
import { Module } from "@nestjs/common";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao";
import { AgreementMonitorService } from "./agreement.monitor.service";
import { TransferModule } from "../dsp/transfer/transfer.module";

@Module({
  imports: [
    CatalogModule,
    TypeOrmModule.forFeature([
      ConstraintDao,
      RuleDao,
      AgreementDao,
      TransferMonitorDao,
    ]),
    AuthModule,
    TransferModule,
  ],
  controllers: [
    AgreementManagementController,
    PolicyEvaluationController,
    RuleRepositoryController,
  ],
  providers: [
    AgreementService,
    AgreementMonitorService,
    PolicyEvaluationService,
    RuleRepositoryService,
  ],
  exports: [
    AgreementService,
    AgreementMonitorService,
    PolicyEvaluationService,
    RuleRepositoryService,
  ],
})
export class PolicyModule {}
