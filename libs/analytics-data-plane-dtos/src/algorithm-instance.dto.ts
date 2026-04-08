import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransferDto } from "@tsg-dsp/common-dtos";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDate,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { AlgorithmDefinitionDto } from "./algorithm-definition.dto.js";
import { AlgorithmEventDto } from "./algorithm-event.dto.js";
import { InternalEventDto } from "./internal-event.dto.js";
import { ProjectAgreementSummaryDto } from "./project-agreement.dto.js";

/**
 * Instance-wide orchestration status, distinct from the local job status.
 * - `pending`: The instance has been created but not all participants have confirmed.
 * - `running`: All participants are executing.
 * - `completed`: The initiator has confirmed that all participants completed successfully.
 * - `error`: The initiator has determined that one or more participants failed.
 */
export const ORCHESTRATION_STATUSES = [
  "pending",
  "running",
  "completed",
  "error"
] as const;

export type OrchestrationStatus = (typeof ORCHESTRATION_STATUSES)[number];

export class AlgorithmParticipant {
  @ApiProperty({ example: "did:example:123456789" })
  @IsString()
  @IsDefined()
  public didId!: string;

  @ApiProperty({
    description: "The role definition assigned to this participant"
  })
  @IsString()
  @IsDefined()
  public role!: string;

  @ApiProperty({
    description: "The dataset describing the data plane"
  })
  @IsString()
  @IsDefined()
  public dataset!: string;
}

export class CreateAlgorithmInstanceDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  id!: string;

  @ApiProperty({ description: "The definition for the algorithm" })
  @Type(() => AlgorithmDefinitionDto)
  @IsDefined()
  public algorithmDefinition!: AlgorithmDefinitionDto;

  @ApiProperty({ description: "Participants for this algorithm" })
  @ValidateNested({ each: true })
  @Type(() => AlgorithmParticipant)
  @ArrayNotEmpty()
  public participants!: AlgorithmParticipant[];

  @ApiPropertyOptional({
    description:
      "The ID of the project agreement to link to this algorithm instance"
  })
  @IsNumber()
  @IsOptional()
  public projectAgreementId?: string;
}

export class AlgorithmInstanceDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  id!: string;

  @ApiProperty({ description: "The definition for the algorithm" })
  @Type(() => AlgorithmDefinitionDto)
  @IsDefined()
  public algorithmDefinition!: AlgorithmDefinitionDto;

  @ApiProperty({ description: "Participants for this algorithm" })
  @ValidateNested({ each: true })
  @Type(() => AlgorithmParticipant)
  @ArrayNotEmpty()
  public participants!: AlgorithmParticipant[];

  @ApiProperty({ example: "2023-01-01T00:00:00.000Z" })
  @IsDate()
  @Type(() => Date)
  createdDate!: Date;

  @ApiProperty({ description: "The current status of the algorithm instance" })
  @IsString()
  status!: string;

  @ApiProperty({ type: Date })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startedAt?: Date;

  @ApiPropertyOptional({ type: Date })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  finishedAt?: Date;

  @ApiPropertyOptional({ type: [TransferDto] })
  @ValidateNested({ each: true })
  @Type(() => TransferDto)
  transfers!: Array<TransferDto>;

  @ApiPropertyOptional({ type: [AlgorithmEventDto] })
  @ValidateNested({ each: true })
  @Type(() => AlgorithmEventDto)
  algorithmEvents!: Array<AlgorithmEventDto>;

  @ApiPropertyOptional({ type: [InternalEventDto] })
  @ValidateNested({ each: true })
  @Type(() => InternalEventDto)
  internalEvents!: Array<InternalEventDto>;

  @ApiPropertyOptional({
    description: "The project agreement linked to this algorithm instance"
  })
  @ValidateNested()
  @Type(() => ProjectAgreementSummaryDto)
  @IsOptional()
  projectAgreement?: ProjectAgreementSummaryDto;

  @ApiPropertyOptional({
    description:
      "Instance-wide orchestration outcome. Distinct from the local job status: " +
      "'error' means a remote participant failed, not necessarily the local job.",
    enum: ORCHESTRATION_STATUSES
  })
  @IsOptional()
  @IsString()
  @IsIn([...ORCHESTRATION_STATUSES])
  orchestrationStatus?: OrchestrationStatus;

  @ApiPropertyOptional({
    description:
      "Whether this ADP is the initiator of the algorithm instance. " +
      "The initiator tracks orchestration status across all participants."
  })
  @IsOptional()
  isInitiator?: boolean;

  @ApiPropertyOptional({
    description:
      "Per-participant job status as reported to the initiator. " +
      "Keys are participant DID IDs, values are 'completed' or 'failed'."
  })
  @IsOptional()
  participantStatuses?: Record<string, "completed" | "failed" | "terminated">;
}
