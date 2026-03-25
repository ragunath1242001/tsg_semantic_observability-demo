import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";
import { CommonDataPlaneModule } from "@tsg-dsp/common-data-plane-api";

import { BridgeWsClientListeners } from "../bridge/client/bridge-ws-client.listeners.js";
import { SplitModeModule } from "../bridge/split-mode/split-mode.module.js";
import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { ProjectAgreementDao } from "../project-agreements/project-agreement.dao.js";
import { ProjectAgreementsModule } from "../project-agreements/project-agreements.module.js";
import { splitModules } from "../utils/split-mode.js";
import { AlgorithmInstancesController } from "./algorithm-instance.controller.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesManagementController } from "./algorithm-instances.management.controller.js";
import { AlgorithmInstancesReadOnlyManagementController } from "./algorithm-instances.readonly.management.controller.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlgorithmInstanceDao,
      TransferDao,
      ProjectAgreementDao
    ]),
    AuthModule,
    CommonDataPlaneModule,
    SplitModeModule,
    ...splitModules([DataPlaneModule, ProjectAgreementsModule])
  ],
  controllers: splitModules(
    [AlgorithmInstancesManagementController, AlgorithmInstancesController],
    [AlgorithmInstancesReadOnlyManagementController]
  ),
  providers: [AlgorithmInstancesService],
  exports: [AlgorithmInstancesService]
})
export class AlgorithmInstancesModule implements OnModuleInit {
  constructor(
    private readonly algorithmInstancesService: AlgorithmInstancesService,
    private readonly bridgeWsClientListeners: BridgeWsClientListeners
  ) {}

  onModuleInit(): void {
    this.bridgeWsClientListeners.setAlgorithmInstanceHandler(
      this.algorithmInstancesService
    );
  }
}
