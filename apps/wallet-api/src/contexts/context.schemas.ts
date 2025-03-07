import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

import { JsonLdContextConfig } from "../config.js";
import { JSONLDContext } from "../model/context.dao.js";

export class JsonLdContextConfigDto implements JsonLdContextConfig {
  @IsString()
  @ApiProperty({ example: "http://example.com/context" })
  id!: string;

  @IsString()
  @ApiProperty({ example: "VerifiableCredential" })
  credentialType!: string;

  @IsBoolean()
  @ApiProperty({ example: true })
  issuable!: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: "http://example.com/document" })
  documentUrl?: string;

  @IsOptional()
  @ApiPropertyOptional({ example: { "@context": "http://schema.org" } })
  document?: Record<string, any>;

  @IsOptional()
  @ApiPropertyOptional({
    example: { type: "object", properties: { name: { type: "string" } } }
  })
  schema?: Record<string, any>;
}

export class JSONLDContextDto implements JSONLDContext {
  @ApiProperty({ example: "http://example.com/context" })
  id!: string;

  @ApiProperty({ example: "VerifiableCredential" })
  credentialType!: string;

  @ApiProperty({ example: true })
  issuable!: boolean;

  @ApiPropertyOptional({ example: "http://example.com/document" })
  documentUrl?: string;

  @ApiPropertyOptional({ example: { "@context": "http://schema.org" } })
  document?: Record<string, any>;

  @ApiPropertyOptional({
    example: { type: "object", properties: { name: { type: "string" } } }
  })
  schema?: Record<string, any>;

  @ApiProperty({ example: "2023-10-01T12:00:00Z" })
  createdDate!: Date;

  @ApiProperty({ example: "2023-10-05T15:30:00Z" })
  modifiedDate!: Date;

  @ApiPropertyOptional({ example: "2023-10-10T08:45:00Z" })
  deletedDate!: Date;
}
