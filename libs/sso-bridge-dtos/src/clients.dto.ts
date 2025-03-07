import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString
} from "class-validator";

import { GrantType } from "./grants.js";

export class ClientDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: "Example Client" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "SecretExample" })
  @IsString()
  @IsNotEmpty()
  secretName!: string;

  @ApiProperty({ example: "A sample client used for demonstration purposes." })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: "client-id-123" })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({ example: "client-secret-abc" })
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;

  @ApiProperty({ example: ["admin", "user"] })
  @IsArray()
  @IsNotEmpty()
  roles!: string[];

  @ApiProperty({ example: ["authorization_code", "client_credentials"] })
  @IsArray()
  @IsNotEmpty()
  grants!: GrantType[];

  @ApiProperty({ example: ["https://example.com/callback"] })
  @IsArray()
  redirectUris!: string[];
}
