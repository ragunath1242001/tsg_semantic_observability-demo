import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonDataPlaneModule } from "@tsg-dsp/common-data-plane-api";

import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import {
  ProjectAgreementCallbackDao,
  ProjectAgreementDao
} from "./project-agreement.dao.js";
import { ProjectAgreementsController } from "./project-agreements.controller.js";
import { ProjectAgreementsManagementController } from "./project-agreements.management.controller.js";
import { ProjectAgreementsService } from "./project-agreements.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectAgreementDao,
      ProjectAgreementCallbackDao
    ]),
    DataPlaneModule,
    CommonDataPlaneModule
  ],
  controllers: [
    ProjectAgreementsController,
    ProjectAgreementsManagementController
  ],
  providers: [ProjectAgreementsService]
})
export class ProjectAgreementsModule {}
