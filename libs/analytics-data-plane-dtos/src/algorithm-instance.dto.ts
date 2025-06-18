import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDate,
  IsDefined,
  IsString,
  ValidateNested
} from "class-validator";

import { AlgorithmDefinitionDto } from "./algorithm-definition.dto.js";

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
}
