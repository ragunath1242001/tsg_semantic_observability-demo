import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransferDto } from "@tsg-dsp/common-dtos";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDate,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { AlgorithmDefinitionDto } from "./algorithm-definition.dto.js";
import { AlgorithmEventDto } from "./algorithm-event.dto.js";
import { InternalEventDto } from "./internal-event.dto.js";

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
}
