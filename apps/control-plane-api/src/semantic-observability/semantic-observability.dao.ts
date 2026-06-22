import { MetaEntity } from "@tsg-dsp/common-api";
import {
  SemanticArtefactReference,
  SemanticArtefactType,
  SemanticObservabilityComponent,
  SemanticObservabilityContext,
  SemanticObservabilityDimension,
  SemanticObservabilityEvent,
  SemanticObservabilityEventType,
  SemanticObservabilityMetricName,
  SemanticObservabilityMetricSnapshot,
  SemanticObservabilitySnapshotBucket,
  SemanticObservabilityStatus
} from "@tsg-dsp/semantic-observability";
import { Column, CreateDateColumn, Entity, Index } from "typeorm";

@Entity("semantic_observability_event")
@Index(["timestamp"])
@Index(["component"])
@Index(["eventType"])
@Index(["status"])
export class SemanticObservabilityEventDao
  extends MetaEntity
  implements SemanticObservabilityEvent
{
  @CreateDateColumn()
  timestamp!: string;

  get eventId(): string {
    return this.id;
  }

  @Column({ type: String })
  component!: SemanticObservabilityComponent;

  @Column({ type: String })
  eventType!: SemanticObservabilityEventType;

  @Column("simple-json")
  dimensions!: SemanticObservabilityDimension[];

  @Column({ type: String })
  status!: SemanticObservabilityStatus;

  @Column("simple-json", { nullable: true })
  context?: SemanticObservabilityContext;

  @Column("simple-json", { nullable: true })
  artefacts?: SemanticArtefactReference[];

  @Column({ type: String, nullable: true })
  failureCategory?: string;

  @Column({ type: Number, nullable: true })
  durationMs?: number;

  @Column({ type: "float", nullable: true })
  metadataCompletenessScore?: number;

  @Column({ type: Number, nullable: true })
  validationErrorCount?: number;

  @Column("simple-json", { nullable: true })
  attributes?: Record<string, string | number | boolean | null>;
}

@Entity("semantic_observability_metric_snapshot")
@Index(["bucket", "timeWindowStart"])
@Index(["metricName"])
@Index(["datasetPseudonym"])
@Index(["participantPairPseudonym"])
export class SemanticObservabilityMetricSnapshotDao
  extends MetaEntity
  implements SemanticObservabilityMetricSnapshot
{
  @Column({ type: String })
  generatedAt!: string;

  @Column({ type: String })
  bucket!: SemanticObservabilitySnapshotBucket;

  @Column({ type: String })
  timeWindowStart!: string;

  @Column({ type: String })
  timeWindowEnd!: string;

  @Column({ type: String })
  metricName!: SemanticObservabilityMetricName;

  @Column({ type: "float" })
  metricValue!: number;

  @Column({ type: Number })
  eventCount!: number;

  @Column({ type: Number, nullable: true })
  count?: number;

  @Column({ type: Number, nullable: true })
  successCount?: number;

  @Column({ type: Number, nullable: true })
  failureCount?: number;

  @Column({ type: String, nullable: true })
  failureCategory?: string;

  @Column({ type: "float", nullable: true })
  averageLatencyMs?: number;

  @Column({ type: String, nullable: true })
  participantPseudonym?: string;

  @Column({ type: String, nullable: true })
  remoteParticipantPseudonym?: string;

  @Column({ type: String, nullable: true })
  participantPairPseudonym?: string;

  @Column({ type: String, nullable: true })
  datasetPseudonym?: string;

  @Column({ type: String, nullable: true })
  datasetCategory?: string;

  @Column({ type: String, nullable: true })
  artefactType?: SemanticArtefactType;

  @Column({ type: String, nullable: true })
  artefactReference?: string;

  @Column({ type: String, nullable: true })
  artefactVersion?: string;
}
