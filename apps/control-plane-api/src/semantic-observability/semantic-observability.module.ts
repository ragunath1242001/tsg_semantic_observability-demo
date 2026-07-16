import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DataPlaneDao } from "../model/dataPlanes.dao.js";
import { CatalogObserverService } from "./catalog-observer.service.js";
import { NegotiationObserverService } from "./negotiation-observer.service.js";
import { PolicyObserverService } from "./policy-observer.service.js";
import { SemanticObservabilityCombinedService } from "./semantic-observability-combined.service.js";
import { SemanticObservabilityController } from "./semantic-observability.controller.js";
import {
  SemanticObservabilityEventDao,
  SemanticObservabilityMetricSnapshotDao
} from "./semantic-observability.dao.js";
import { SemanticObservabilitySdoExporterService } from "./semantic-observability-sdo-exporter.service.js";
import { SemanticObservabilityService } from "./semantic-observability.service.js";
import { TransferObserverService } from "./transfer-observer.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SemanticObservabilityEventDao,
      SemanticObservabilityMetricSnapshotDao,
      DataPlaneDao
    ]),
    AuthModule
  ],
  controllers: [SemanticObservabilityController],
  providers: [
    CatalogObserverService,
    NegotiationObserverService,
    PolicyObserverService,
    SemanticObservabilityCombinedService,
    SemanticObservabilitySdoExporterService,
    SemanticObservabilityService,
    TransferObserverService
  ],
  exports: [
    CatalogObserverService,
    NegotiationObserverService,
    PolicyObserverService,
    SemanticObservabilitySdoExporterService,
    SemanticObservabilityService,
    TransferObserverService
  ]
})
export class SemanticObservabilityModule {}
