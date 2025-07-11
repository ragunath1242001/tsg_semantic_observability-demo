import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { IssueConfiguration } from "../model/issue-configuration.dao.js";
import { IssueConfigurationController } from "./issue-configuration.controller.js";
import { IssueConfigurationManagementController } from "./issue-configuration.management.controller.js";
import { IssueConfigurationService } from "./issue-configuration.service.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([IssueConfiguration])],
  controllers: [
    IssueConfigurationController,
    IssueConfigurationManagementController
  ],
  providers: [IssueConfigurationService],
  exports: [IssueConfigurationService]
})
export class IssueConfigurationModule {}
