import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

import { ClientAuthMethod, GrantType } from "./grants.js";

export class ClientDto {
  @ApiPropertyOptional({ example: "1" })
  @IsString()
  @IsOptional()
  id?: string;

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

  @ApiPropertyOptional({
    example: "client-secret-abc",
    description:
      "Client secret for symmetric authentication. Required when tokenEndpointAuthMethod is client_secret_post."
  })
  @IsString()
  @IsOptional()
  clientSecret?: string;

  @ApiPropertyOptional({
    example: "client_secret_post",
    description:
      "Authentication method used at the token endpoint. Defaults to client_secret_post.",
    enum: ["client_secret_post", "private_key_jwt", "none"]
  })
  @IsString()
  @IsIn(["client_secret_post", "private_key_jwt", "none"])
  @IsOptional()
  tokenEndpointAuthMethod?: ClientAuthMethod;

  @ApiPropertyOptional({
    example: {
      kty: "RSA",
      n: "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
      e: "AQAB",
      kid: "client-key-1"
    },
    description:
      "Public key in JWK format for asymmetric authentication. Required when tokenEndpointAuthMethod is private_key_jwt."
  })
  @IsObject()
  @IsOptional()
  jwk?: Record<string, any>;

  @ApiProperty({
    example: ["manage:catalog", "read:dataset"],
    description:
      "Client permissions (can be permission strings or permission set names)"
  })
  @IsArray()
  @IsNotEmpty()
  permissions!: string[];

  @ApiProperty({ example: ["authorization_code", "client_credentials"] })
  @IsArray()
  @IsNotEmpty()
  grants!: GrantType[];

  @ApiProperty({ example: ["https://example.com/callback"] })
  @IsArray()
  redirectUris!: string[];
}
