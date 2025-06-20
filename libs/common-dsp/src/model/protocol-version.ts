import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

type Binding = "HTTPS" | (string & {});
type Version = "0.8" | "2024-1" | "2025-1" | (string & {});

export class Auth {
  @ApiProperty({ description: "Authentication protocol" })
  @IsString()
  protocol!: string;

  @ApiProperty({ description: "Authentication protocol version" })
  @IsString()
  version!: string;

  @ApiProperty({
    description: "Authentication profiles",
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  profile?: string[];
}

export class ProtocolVersion {
  @ApiProperty({
    description: "The version string",
    anyOf: [
      {
        type: "string",
        enum: ["0.8", "2024-1", "2025-1"]
      },
      {
        type: "string"
      }
    ],
    example: "2025-1"
  })
  @IsString()
  version!: Version;

  @ApiProperty({ description: "The path for the protocol version" })
  @IsString()
  path!: string;

  @ApiProperty({
    description: "The binding type",
    anyOf: [
      {
        type: "string",
        enum: ["HTTPS"]
      },
      {
        type: "string"
      }
    ]
  })
  @IsString()
  binding!: Binding;

  @ApiProperty({
    description: "Identifier type",
    required: false
  })
  @IsString()
  @IsOptional()
  identifierType?: string;

  @ApiProperty({
    description: "Service ID",
    required: false
  })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({
    description: "Authentication information",
    type: () => Auth,
    required: false
  })
  @ValidateNested()
  @Type(() => Auth)
  @IsOptional()
  auth?: Auth;
}

export class VersionSchema {
  @ApiProperty({
    type: [ProtocolVersion],
    description: "List of protocol versions",
    minItems: 1
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProtocolVersion)
  protocolVersions!: ProtocolVersion[];
}
