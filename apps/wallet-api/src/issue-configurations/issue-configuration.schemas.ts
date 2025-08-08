import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Matches
} from "class-validator";

import { IssueConfigurationConfig } from "../config.js";
import { IssueConfiguration } from "../model/issue-configuration.dao.js";

export class IssueConfigurationConfigDto implements IssueConfigurationConfig {
  @IsString()
  @ApiProperty({ example: "http://example.com/context" })
  id!: string;

  @IsString()
  @ApiProperty({ example: "VerifiableCredential" })
  credentialType!: string;

  @IsEnum(["jwt", "ldp"])
  @IsOptional()
  @ApiPropertyOptional({ example: "jwt" })
  proofType: "jwt" | "ldp" = "jwt";

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: "http://example.com/document" })
  documentUrl?: string;

  @IsOptional()
  @ApiPropertyOptional({ example: { "@context": "http://schema.org" } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document?: Record<string, any>;

  @IsOptional()
  @ApiPropertyOptional({
    example: { type: "object", properties: { name: { type: "string" } } }
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: Record<string, any>;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: "Professional Certificate" })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: "A professional certification credential" })
  description?: string;

  @IsString()
  @IsHexColor()
  @IsOptional()
  @ApiPropertyOptional({ example: "#3B82F6" })
  backgroundColor?: string;

  @IsString()
  @Matches(
    /^(data:image\/[a-zA-Z0-9+-]+;base64,[a-zA-Z0-9+/=]+|https:\/\/.+)$/,
    {
      message:
        "Background image must be a valid Base64 data URL or public HTTPS URL"
    }
  )
  @IsOptional()
  @ApiPropertyOptional({ example: "https://example.com/background.jpg" })
  backgroundImage?: string;

  @IsString()
  @IsHexColor()
  @IsOptional()
  @ApiPropertyOptional({ example: "#FFFFFF" })
  textColor?: string;
}

export class IssueConfigurationDto implements IssueConfiguration {
  @ApiProperty({ example: "http://example.com/context" })
  id!: string;

  @ApiProperty({ example: "VerifiableCredential" })
  credentialType!: string;

  @IsEnum(["jwt", "ldp"])
  proofType: "jwt" | "ldp" = "jwt";

  @ApiPropertyOptional({ example: "http://example.com/document" })
  documentUrl?: string;

  @ApiPropertyOptional({ example: { "@context": "http://schema.org" } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document?: Record<string, any>;

  @ApiPropertyOptional({
    example: { type: "object", properties: { name: { type: "string" } } }
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: Record<string, any>;

  @ApiPropertyOptional({ example: "Professional Certificate" })
  name?: string;

  @ApiPropertyOptional({ example: "A professional certification credential" })
  description?: string;

  @ApiPropertyOptional({ example: "#3B82F6" })
  backgroundColor?: string;

  @ApiPropertyOptional({ example: "https://example.com/background.jpg" })
  backgroundImage?: string;

  @ApiPropertyOptional({ example: "#FFFFFF" })
  textColor?: string;

  @ApiProperty({ example: "2023-10-01T12:00:00Z" })
  createdDate!: Date;

  @ApiProperty({ example: "2023-10-05T15:30:00Z" })
  modifiedDate!: Date;

  @ApiPropertyOptional({ example: "2023-10-10T08:45:00Z" })
  deletedDate!: Date;
}
