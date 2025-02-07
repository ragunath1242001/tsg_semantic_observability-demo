import { ApiProperty } from "@nestjs/swagger";
import { JsonWebKeyDto } from "@tsg-dsp/common-dtos";
import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsIn,
  IsDefined,
  ValidateNested,
  IsInt
} from "class-validator";
import { JWK } from "jose";

export class AuthorizationRequest {
  @ApiProperty({
    example: "code",
    description: "The response type of the authorization"
  })
  @IsString()
  response_type!: string;

  @ApiProperty({
    example: "query",
    description: "The response mode of the authorization",
    enum: ["query", "fragment"]
  })
  @IsIn(["query", "fragment"])
  @IsOptional()
  response_mode?: "query" | "fragment";

  @ApiProperty({
    example: "client-id",
    description: "The client identifier issuing the authorization request"
  })
  @IsString()
  client_id!: string;

  @ApiProperty({
    example: "https://example.com/redirect",
    description: "The URI to redirect to after authorization"
  })
  @IsString()
  redirect_uri!: string;

  @ApiProperty({
    example: "openid profile email",
    description: "Optional scope",
    required: false
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({
    example: "randomState",
    description: "Optional state parameter",
    required: false
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: "randomNonce",
    description: "Optional nonce parameter",
    required: false
  })
  @IsOptional()
  @IsString()
  nonce?: string;

  @ApiProperty({
    example: "randomChallenge",
    description: "Optional challenge parameter",
    required: false
  })
  code_challenge?: string;

  @ApiProperty({
    example: "S256",
    description: "Optional challenge method",
    enum: ["plain", "S256"],
    required: false
  })
  code_challenge_method?: "plain" | "S256";
}

export abstract class TokenRequest {
  @ApiProperty({
    description: "The grant type of the token request",
    enum: ["authorization_code", "refresh_token", "client_credentials"]
  })
  @IsString()
  @IsIn(["authorization_code", "refresh_token", "client_credentials"])
  abstract grant_type:
    | "authorization_code"
    | "refresh_token"
    | "client_credentials";
}

export class CodeTokenRequest extends TokenRequest {
  override grant_type: "authorization_code" = "authorization_code";

  @ApiProperty({
    example: "code",
    description: "The authorization code"
  })
  @IsString()
  code!: string;

  @ApiProperty({
    example: "client-id",
    description: "The client identifier issuing the token request"
  })
  @IsString()
  client_id!: string;

  @ApiProperty({
    example: "https://example.com/redirect",
    description: "The URI to redirect to after authorization"
  })
  @IsString()
  redirect_uri!: string;
}

export class RefreshTokenRequest extends TokenRequest {
  override grant_type: "refresh_token" = "refresh_token";

  @ApiProperty({
    example: "refresh_token",
    description: "The refresh token"
  })
  @IsString()
  refresh_token!: string;
}

export class ClientCredentialsTokenRequest extends TokenRequest {
  override grant_type: "client_credentials" = "client_credentials";

  @ApiProperty({
    example: "client-id",
    description: "The client identifier issuing the token request"
  })
  @IsString()
  client_id!: string;

  @ApiProperty({
    example: "client-secret",
    description: "The client secret"
  })
  @IsString()
  client_secret!: string;
}

export class TokenRequestWrapper {
  @ValidateNested()
  @Type(() => TokenRequest, {
    discriminator: {
      property: "grant_type",
      subTypes: [
        { value: CodeTokenRequest, name: "authorization_code" },
        { value: RefreshTokenRequest, name: "refresh_token" },
        { value: ClientCredentialsTokenRequest, name: "client_credentials" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  @IsDefined()
  public request!: TokenRequest;
}

export class TokenResponse {
  @ApiProperty({
    example: "Bearer",
    description: "The token type"
  })
  @IsString()
  token_type!: string;

  @ApiProperty({
    example: 3600,
    description: "The token expiration in seconds"
  })
  @IsInt()
  expires_in!: number;

  @ApiProperty({
    description: "The JWT access token"
  })
  @IsString()
  access_token!: string;

  @ApiProperty({
    description: "The ID token"
  })
  @IsString()
  id_token!: string;

  @ApiProperty({
    example: "refresh_token",
    description: "The JWT refresh token",
    required: false
  })
  @IsString()
  @IsOptional()
  refresh_token?: string;

  @ApiProperty({
    example: "openid profile email",
    description: "The scope of the token",
    required: false
  })
  @IsString()
  @IsOptional()
  scope?: string;
}

export class JWKS {
  @ApiProperty({
    description: "The key set",
    type: [JsonWebKeyDto]
  })
  keys!: JWK[];
}

export class OpenIDConfiguration {
  @ApiProperty({ description: "Issuer of the OpenID configuration" })
  issuer!: string;

  @ApiProperty({ description: "Authorization endpoint" })
  authorization_endpoint!: string;

  @ApiProperty({ description: "Token endpoint" })
  token_endpoint!: string;

  @ApiProperty({ description: "Userinfo endpoint" })
  userinfo_endpoint!: string;

  @ApiProperty({ description: "Introspection endpoint" })
  introspection_endpoint!: string;

  @ApiProperty({ description: "Device authorization endpoint" })
  device_authorization_endpoint!: string;

  @ApiProperty({ description: "Revocation endpoint" })
  revocation_endpoint!: string;

  @ApiProperty({ description: "JWKS URI" })
  jwks_uri!: string;

  @ApiProperty({
    description: "Supported response types",
    type: [String]
  })
  response_types_supported!: string[];

  @ApiProperty({
    description: "Supported response modes",
    type: [String]
  })
  response_modes_supported!: string[];

  @ApiProperty({
    description: "Supported ID token signing algorithms",
    type: [String]
  })
  id_token_signing_alg_values_supported!: string[];

  @ApiProperty({
    description: "Supported scopes",
    type: [String]
  })
  scopes_supported!: string[];

  @ApiProperty({
    description: "Supported grant types",
    type: [String]
  })
  grant_types_supported!: string[];

  @ApiProperty({
    description: "Supported subject types",
    type: [String]
  })
  subject_types_supported!: string[];

  @ApiProperty({
    description: "Supported claims",
    type: [String]
  })
  claims_supported!: string[];
}
