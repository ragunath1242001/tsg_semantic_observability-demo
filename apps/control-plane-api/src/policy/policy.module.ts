import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogModule } from "../dsp/catalog/catalog.module.js";
import { AgreementManagementController } from "./agreement.management.controller.js";
import { AgreementService } from "./agreement.service.js";
import { PolicyEvaluationController } from "./policy.evaluation.controller.js";
import { PolicyEvaluationService } from "./policy.evaluation.service.js";
import { ConstraintDao, RuleDao } from "../model/rule.dao.js";
import { RuleRepositoryController } from "./rule.repository.controller.js";
import { RuleRepositoryService } from "./rule.repository.service.js";
import { Module } from "@nestjs/common";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { AgreementMonitorService } from "./agreement.monitor.service.js";
import { TransferModule } from "../dsp/transfer/transfer.module.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    CatalogModule,
    TypeOrmModule.forFeature([
      ConstraintDao,
      RuleDao,
      AgreementDao,
      TransferMonitorDao
    ]),
    AuthModule,
    TransferModule
  ],
  controllers: [
    AgreementManagementController,
    PolicyEvaluationController,
    RuleRepositoryController
  ],
  providers: [
    AgreementService,
    AgreementMonitorService,
    PolicyEvaluationService,
    RuleRepositoryService
  ],
  exports: [
    AgreementService,
    AgreementMonitorService,
    PolicyEvaluationService,
    RuleRepositoryService
  ]
})
export class PolicyModule {}
