import { Module, Provider } from "@nestjs/common";
import { AuthModule } from "@tsg-dsp/common-api";

import { AlgorithmInstancesModule } from "../algorithm-instances/algorithm-instances.module.js";
import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { RootConfig } from "../config.js";
import { FilesModule } from "../files/files.module.js";
import { FilesService } from "../files/files.service.js";
import { DockerOrchestrationService } from "./docker.orchestration.service.js";
import { KubernetesOrchestrationService } from "./kubernetes.orchestration.service.js";
import { IOrchestrationService } from "./orchestration.interface.js";
import { OrchestrationManagementController } from "./orchestration.management.controller.js";

/**
 * Factory function to create the appropriate orchestration service
 * based on the configuration.
 */
const orchestrationServiceProvider: Provider = {
  provide: IOrchestrationService,
  useFactory: (
    config: RootConfig,
    filesService: FilesService,
    algorithmInstancesService: AlgorithmInstancesService
  ) => {
    const orchestrationType = config.orchestration.type;

    if (orchestrationType === "docker") {
      return new DockerOrchestrationService(
        config,
        config.orchestration,
        filesService,
        algorithmInstancesService
      );
    }

    return new KubernetesOrchestrationService(
      config,
      config.orchestration,
      filesService,
      algorithmInstancesService
    );
  },
  inject: [RootConfig, FilesService, AlgorithmInstancesService]
};

@Module({
  imports: [AuthModule, FilesModule, AlgorithmInstancesModule],
  controllers: [OrchestrationManagementController],
  providers: [orchestrationServiceProvider],
  exports: [IOrchestrationService]
})
export class OrchestrationModule {}
