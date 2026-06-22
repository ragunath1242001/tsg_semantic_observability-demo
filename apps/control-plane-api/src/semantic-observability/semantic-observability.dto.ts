import {
  SemanticArtefactType,
  SemanticObservabilityComponent,
  SemanticObservabilityEventType,
  SemanticObservabilityMetricName,
  SemanticObservabilityReportFilter,
  SemanticObservabilitySnapshotBucket,
  SemanticObservabilitySnapshotFilter,
  SemanticObservabilityStatus
} from "@tsg-dsp/semantic-observability";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class SemanticObservabilityEventFilterDto {
  @IsEnum(SemanticObservabilityComponent)
  @IsOptional()
  component?: SemanticObservabilityComponent;

  @IsEnum(SemanticObservabilityEventType)
  @IsOptional()
  eventType?: SemanticObservabilityEventType;

  @IsEnum(SemanticObservabilityStatus)
  @IsOptional()
  status?: SemanticObservabilityStatus;
}

export class SemanticObservabilityReportFilterDto implements SemanticObservabilityReportFilter {
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  participantPseudonym?: string;

  @IsString()
  @IsOptional()
  remoteParticipantPseudonym?: string;

  @IsString()
  @IsOptional()
  participantPairPseudonym?: string;

  @IsString()
  @IsOptional()
  datasetPseudonym?: string;

  @IsString()
  @IsOptional()
  datasetCategory?: string;

  @IsEnum(SemanticArtefactType)
  @IsOptional()
  artefactType?: SemanticArtefactType;

  @IsString()
  @IsOptional()
  artefactReference?: string;

  @IsString()
  @IsOptional()
  artefactVersion?: string;
}

export class SemanticObservabilitySnapshotFilterDto
  extends SemanticObservabilityReportFilterDto
  implements SemanticObservabilitySnapshotFilter
{
  @IsEnum(SemanticObservabilitySnapshotBucket)
  @IsOptional()
  bucket?: SemanticObservabilitySnapshotBucket;

  @IsEnum(SemanticObservabilityMetricName)
  @IsOptional()
  metricName?: SemanticObservabilityMetricName;
}
