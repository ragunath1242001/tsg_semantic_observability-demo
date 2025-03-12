import "reflect-metadata";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { DatasetDto } from "../dsp/catalog/catalog.dto.js";
import { DatasetSchema } from "../dsp/catalog/catalog.schema.js";

class DataPlaneBaseDto {
  @ApiPropertyOptional({
    type: () => [DatasetSchema],
    example: [{ id: "dataset-123", name: "Example Dataset" }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetSchema)
  datasets?: DatasetDto[];

  @ApiProperty({ example: "exampleType" })
  @IsString()
  dataplaneType!: string;

  @ApiProperty({ example: "/api/v1/dataplane" })
  @IsString()
  endpointPrefix!: string;

  @ApiProperty({ example: "http://localhost/callback" })
  @IsString()
  callbackAddress!: string;

  @ApiProperty({ example: "http://localhost/manage" })
  @IsString()
  managementAddress!: string;

  @ApiProperty({ example: "token123" })
  @IsString()
  managementToken!: string;

  @ApiProperty({ enum: ["push", "pull"], example: "push" })
  @IsEnum(["push", "pull"])
  catalogSynchronization!: "push" | "pull";

  @ApiProperty({ enum: ["consumer", "provider", "both"], example: "consumer" })
  @IsEnum(["consumer", "provider", "both"])
  role!: "consumer" | "provider" | "both";
}

export class DataPlaneDetailsDto extends DataPlaneBaseDto {
  @ApiProperty({ example: "dp-12345" })
  @IsString()
  identifier!: string;
}

export class DataPlaneCreation extends DataPlaneBaseDto {
  @ApiPropertyOptional({ example: "dp-optional-12345" })
  @IsOptional()
  @IsString()
  identifier?: string;
}

export class DataPlaneAddressDto {
  @ApiProperty({ example: "http://data-plane-endpoint" })
  @IsString()
  endpoint!: string;

  @ApiProperty({
    type: () => [DataPlaneProperty],
    example: [{ name: "propertyName", value: "propertyValue" }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataPlaneProperty)
  properties!: DataPlaneProperty[];
}

export class DataPlaneProperty {
  @ApiProperty({ example: "propertyName" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "propertyValue" })
  @IsString()
  value!: string;
}

export class DataPlaneRequestResponseDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  accepted!: boolean;

  @ApiProperty({ example: "req-identifier" })
  @IsString()
  identifier!: string;

  @ApiPropertyOptional({
    type: () => DataPlaneAddressDto,
    example: {
      endpoint: "http://address",
      properties: [{ name: "key", value: "value" }]
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataPlaneAddressDto)
  dataAddress?: DataPlaneAddressDto;

  @ApiPropertyOptional({ example: "http://callback-address" })
  @IsOptional()
  @IsString()
  callbackAddress?: string;
}

export class DataPlaneTransferDto extends DataPlaneRequestResponseDto {
  @ApiProperty({ example: "transfer-identifier" })
  @IsString()
  dataPlaneIdentifier!: string;

  @ApiProperty({ example: "type1" })
  @IsString()
  endpointType!: string;
}
