import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  DataAddressDto,
  DataAddressSchema,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferRequestMessageSchema,
  TransferState
} from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";

export class TransferDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  id!: string;

  @ApiProperty({ enum: ["provider", "consumer"], example: "provider" })
  @IsEnum(["provider", "consumer"])
  role!: "provider" | "consumer";

  @ApiProperty({ example: "process-001" })
  @IsString()
  processId!: string;

  @ApiProperty({ example: "remote-system" })
  @IsString()
  remoteParty!: string;

  @ApiPropertyOptional({ example: "secret-key" })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({
    example: "urn:uuid:123e4567-e89b-12d3-a456-426614174000"
  })
  @IsOptional()
  @IsString()
  datasetId?: string;

  @ApiProperty({ enum: TransferState, example: "REQUESTED" })
  @IsEnum(TransferState)
  state!: TransferState;

  @ApiProperty({ type: () => TransferRequestMessageSchema, example: {} })
  @Type(() => TransferRequestMessageSchema)
  request!: TransferRequestMessageDto;

  @ApiProperty({ type: () => DataPlaneRequestResponseDto, example: {} })
  @Type(() => DataPlaneRequestResponseDto)
  response!: DataPlaneRequestResponseDto;

  @ApiPropertyOptional({ type: () => DataAddressSchema, example: {} })
  @IsOptional()
  @Type(() => DataAddressSchema)
  dataAddress?: DataAddressDto;

  @ApiProperty({ example: "2023-01-01T00:00:00.000Z" })
  @IsDate()
  @Type(() => Date)
  createdDate!: Date;

  @ApiProperty({ example: "2023-01-02T00:00:00.000Z" })
  @IsDate()
  @Type(() => Date)
  modifiedDate!: Date;

  @ApiProperty({ example: "2023-01-03T00:00:00.000Z" })
  @IsDate()
  @Type(() => Date)
  deletedDate!: Date;
}
