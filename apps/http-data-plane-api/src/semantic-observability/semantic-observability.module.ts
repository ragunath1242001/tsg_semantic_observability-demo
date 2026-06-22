import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DatasetConfigObserverService } from "./dataset-config-observer.service.js";
import { SemanticObservabilityController } from "./semantic-observability.controller.js";
import {
  SemanticObservabilityEventDao,
  SemanticObservabilityMetricSnapshotDao
} from "./semantic-observability.dao.js";
import { SemanticObservabilityService } from "./semantic-observability.service.js";
import { TransferExecutionObserverService } from "./transfer-execution-observer.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SemanticObservabilityEventDao,
      SemanticObservabilityMetricSnapshotDao
    ]),
    AuthModule
  ],
  controllers: [SemanticObservabilityController],
  providers: [
    DatasetConfigObserverService,
    SemanticObservabilityService,
    TransferExecutionObserverService
  ],
  exports: [
    DatasetConfigObserverService,
    SemanticObservabilityService,
    TransferExecutionObserverService
  ]
})
export class SemanticObservabilityModule {}
