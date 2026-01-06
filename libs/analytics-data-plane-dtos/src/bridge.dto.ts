import { ApiProperty } from "@nestjs/swagger";
import { DatasetDto } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { AlgorithmDefinitionDto } from "./algorithm-definition.dto.js";
import { AlgorithmParticipant } from "./algorithm-instance.dto.js";
import { CreateAlgorithmEventDto } from "./create-algorithm-event.dto.js";
import { FileMetadataDto } from "./files.dto.js";
import { ProjectAgreementSummaryDto } from "./project-agreement.dto.js";

export class BridgePushFileMetadataDto {
  @ApiProperty({ type: () => FileMetadataDto })
  @ValidateNested()
  @Type(() => FileMetadataDto)
  file!: FileMetadataDto;
}

export class BridgeUpsertDatasetsDto {
  @ApiProperty({ type: Object })
  @IsObject()
  // DatasetDto is an interface; we can only validate it is an object.
  dataset!: DatasetDto;
}

export class BridgeDeleteDatasetsDto {
  @ApiProperty({
    type: String,
    description: "Dataset @id value"
  })
  @IsString()
  datasetId!: string;
}

export class BridgeAlgorithmInstanceMetadataDto {
  @ApiProperty({ example: "urn:uuid:123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  id!: string;

  @ApiProperty({ description: "The definition for the algorithm" })
  @ValidateNested()
  @Type(() => AlgorithmDefinitionDto)
  algorithmDefinition!: AlgorithmDefinitionDto;

  @ApiProperty({ description: "Participants for this algorithm" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlgorithmParticipant)
  participants!: AlgorithmParticipant[];

  @ApiProperty({ example: "2023-01-01T00:00:00.000Z" })
  @IsDate()
  @Type(() => Date)
  createdDate!: Date;

  @ApiProperty({ description: "The current status of the algorithm instance" })
  @IsString()
  status!: string;

  @ApiProperty({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startedAt?: Date;

  @ApiProperty({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  finishedAt?: Date;

  @ApiProperty({ required: false, type: () => ProjectAgreementSummaryDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => ProjectAgreementSummaryDto)
  projectAgreement?: ProjectAgreementSummaryDto;
}

export class BridgePushAlgorithmInstanceDto {
  @ApiProperty({ type: () => BridgeAlgorithmInstanceMetadataDto })
  @ValidateNested()
  @Type(() => BridgeAlgorithmInstanceMetadataDto)
  algorithmInstance!: BridgeAlgorithmInstanceMetadataDto;

  @ApiProperty({ required: false, enum: ["created", "updated"] })
  @IsOptional()
  @IsString()
  @IsIn(["created", "updated"])
  reason?: "created" | "updated";
}

export class BridgeStartAlgorithmInstanceDto {
  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty({ required: false, example: "2025-12-12T10:00:00.000Z" })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  requestedAt?: Date;
}

export class BridgeJobStatusUpdateDto {
  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty({ example: "running" })
  @IsString()
  status!: string;

  @ApiProperty({ required: false, example: "adp-job-..." })
  @IsString()
  @IsOptional()
  jobName?: string;

  @ApiProperty({ required: false, example: "2025-12-12T10:00:00.000Z" })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  observedAt?: Date;
}

export class BridgeCreateAlgorithmEventDto {
  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty({ type: () => CreateAlgorithmEventDto })
  @ValidateNested()
  @Type(() => CreateAlgorithmEventDto)
  event!: CreateAlgorithmEventDto;
}

export class BridgePushAlgorithmEventDto {
  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty({ example: "urn:uuid:...", required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ type: () => CreateAlgorithmEventDto })
  @ValidateNested()
  @Type(() => CreateAlgorithmEventDto)
  event!: CreateAlgorithmEventDto;

  @ApiProperty({ example: "did:web:remoteparty" })
  @IsString()
  createdBy!: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transferIds?: string[];
}

export class BridgePushAlgorithmEventDataDto {
  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  eventId!: string;

  // Note: binary payload over Socket.IO; validation beyond presence is not meaningful here.
  @ApiProperty({ required: false, type: String, format: "binary" })
  @IsOptional()
  eventData?: Uint8Array;
}

/**
 * DTO for chunked algorithm event data transfer.
 * Used when event data is too large to send in a single WebSocket message.
 */
export class BridgeAlgorithmEventDataChunkDto {
  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty({ example: "urn:uuid:..." })
  @IsString()
  eventId!: string;

  @ApiProperty({
    description:
      "Unique transfer ID to correlate chunks belonging to the same upload"
  })
  @IsString()
  transferId!: string;

  @ApiProperty({ description: "Zero-based chunk index" })
  @IsNumber()
  chunkIndex!: number;

  @ApiProperty({ description: "Total number of chunks for this transfer" })
  @IsNumber()
  totalChunks!: number;

  @ApiProperty({ description: "Total size of the complete data in bytes" })
  @IsNumber()
  totalSize!: number;

  @ApiProperty({
    description: "Whether this is the final chunk",
    required: false
  })
  @IsBoolean()
  @IsOptional()
  isFinal?: boolean;

  // Note: binary payload over Socket.IO
  @ApiProperty({ required: false, type: String, format: "binary" })
  @IsOptional()
  chunkData?: Uint8Array;
}
