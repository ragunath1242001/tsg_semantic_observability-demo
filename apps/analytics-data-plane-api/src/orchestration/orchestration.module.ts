import { Module } from "@nestjs/common";
import { AuthModule } from "@tsg-dsp/common-api";

import { AlgorithmInstancesModule } from "../algorithm-instances/algorithm-instances.module.js";
import { FilesModule } from "../files/files.module.js";
import { OrchestrationManagementController } from "./orchestration.management.controller.js";
import { OrchestrationService } from "./orchestration.service.js";

@Module({
  imports: [AuthModule, FilesModule, AlgorithmInstancesModule],
  controllers: [OrchestrationManagementController],
  providers: [OrchestrationService],
  exports: [OrchestrationService]
})
export class OrchestrationModule {}
