import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import {
  DataAddressDto,
  DataAddressSchema,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferRequestMessageSchema,
  TransferState
} from "@tsg-dsp/common-dsp";

export class TransferDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ enum: ["provider", "consumer"] })
  @IsEnum(["provider", "consumer"])
  role!: "provider" | "consumer";

  @ApiProperty()
  @IsString()
  processId!: string;

  @ApiProperty()
  @IsString()
  remoteParty!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ enum: TransferState })
  @IsEnum(TransferState)
  state!: TransferState;

  @ApiProperty({ type: () => TransferRequestMessageSchema })
  @Type(() => TransferRequestMessageSchema)
  request!: TransferRequestMessageDto;

  @ApiProperty({ type: () => DataPlaneRequestResponseDto })
  @Type(() => DataPlaneRequestResponseDto)
  response!: DataPlaneRequestResponseDto;

  @ApiPropertyOptional({ type: () => DataAddressSchema })
  @IsOptional()
  @Type(() => DataAddressSchema)
  dataAddress?: DataAddressDto;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  createdDate!: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  modifiedDate!: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  deletedDate!: Date;
}
