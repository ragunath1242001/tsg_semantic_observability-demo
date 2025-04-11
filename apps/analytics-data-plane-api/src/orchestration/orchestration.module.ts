import { Module } from "@nestjs/common";
import { AuthModule } from "@tsg-dsp/common-api";

import { FilesModule } from "../files/files.module.js";
import { LoggingModule } from "../logging/logging.module.js";
import { OrchestrationManagementController } from "./orchestration.management.controller.js";
import { OrchestrationService } from "./orchestration.service.js";

@Module({
  imports: [AuthModule, LoggingModule, FilesModule],
  controllers: [OrchestrationManagementController],
  providers: [OrchestrationService],
  exports: [OrchestrationService]
})
export class OrchestrationModule {}
