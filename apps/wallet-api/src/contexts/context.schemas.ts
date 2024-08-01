import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional } from "class-validator";
import { JsonLdContextConfig } from "../config.js";
import { JSONLDContext } from "../model/context.dao.js";

export class JsonLdContextConfigDto implements JsonLdContextConfig {
  @IsString()
  @ApiProperty()
  id!: string;
  @IsString()
  @ApiProperty()
  credentialType!: string;
  @IsBoolean()
  @ApiProperty()
  issuable!: boolean;
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  documentUrl?: string;
  @IsOptional()
  @ApiPropertyOptional()
  document?: Record<string, any>;
  @IsOptional()
  @ApiPropertyOptional()
  schema?: Record<string, any>;
}

export class JSONLDContextDto implements JSONLDContext {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  credentialType!: string;
  @ApiProperty()
  issuable!: boolean;
  @ApiPropertyOptional()
  documentUrl?: string;
  @ApiPropertyOptional()
  document?: Record<string, any>;
  @ApiPropertyOptional()
  schema?: Record<string, any>;
  @ApiProperty()
  created!: Date;
  @ApiProperty()
  modified!: Date;
  @ApiProperty()
  @ApiPropertyOptional()
  deleted!: Date;
}
