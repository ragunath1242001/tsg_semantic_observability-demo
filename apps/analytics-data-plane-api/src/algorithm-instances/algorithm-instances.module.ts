import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmInstancesController } from "./algorithm-instance.controller.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesManagementController } from "./algorithm-instances.management.controller.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([AlgorithmInstanceDao, TransferDao]),
    AuthModule,
    DataPlaneModule
  ],
  controllers: [
    AlgorithmInstancesManagementController,
    AlgorithmInstancesController
  ],
  providers: [AlgorithmInstancesService],
  exports: [AlgorithmInstancesService]
})
export class AlgorithmInstancesModule {}
