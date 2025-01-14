import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean
} from "class-validator";
import { Type } from "class-transformer";
import { DatasetDto } from "../dsp/catalog/catalog.dto.js";
import { DatasetSchema } from "../dsp/catalog/catalog.schema.js";

class DataPlaneBaseDto {
  @ApiPropertyOptional({ type: () => [DatasetSchema] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetSchema)
  datasets?: DatasetDto[];

  @ApiProperty()
  @IsString()
  dataplaneType!: string;

  @ApiProperty()
  @IsString()
  endpointPrefix!: string;

  @ApiProperty()
  @IsString()
  callbackAddress!: string;

  @ApiProperty()
  @IsString()
  managementAddress!: string;

  @ApiProperty()
  @IsString()
  managementToken!: string;

  @ApiProperty({ enum: ["push", "pull"] })
  @IsEnum(["push", "pull"])
  catalogSynchronization!: "push" | "pull";

  @ApiProperty({ enum: ["consumer", "provider", "both"] })
  @IsEnum(["consumer", "provider", "both"])
  role!: "consumer" | "provider" | "both";
}

export class DataPlaneDetailsDto extends DataPlaneBaseDto {
  @ApiProperty()
  @IsString()
  identifier!: string;
}

export class DataPlaneCreation extends DataPlaneBaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identifier?: string;
}

export class DataPlaneAddressDto {
  @ApiProperty()
  @IsString()
  endpoint!: string;

  @ApiProperty({ type: () => [DataPlaneProperty] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataPlaneProperty)
  properties!: DataPlaneProperty[];
}

export class DataPlaneProperty {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  value!: string;
}

export class DataPlaneRequestResponseDto {
  @ApiProperty()
  @IsBoolean()
  accepted!: boolean;

  @ApiProperty()
  @IsString()
  identifier!: string;

  @ApiPropertyOptional({ type: () => DataPlaneAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataPlaneAddressDto)
  dataAddress?: DataPlaneAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackAddress?: string;
}

export class DataPlaneTransferDto extends DataPlaneRequestResponseDto {
  @ApiProperty()
  @IsString()
  dataPlaneIdentifier!: string;

  @ApiProperty()
  @IsString()
  endpointType!: string;
}
