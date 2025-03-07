import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class JwtVpClaimFormat {
  @ApiProperty({ type: [String], example: ["Ed25519"] })
  @IsArray()
  @IsString({ each: true })
  alg!: string[];
}

export class Format {
  @ApiPropertyOptional({
    type: () => JwtVpClaimFormat,
    example: { alg: ["ES256"] }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JwtVpClaimFormat)
  jwt_vp?: JwtVpClaimFormat;
}

export class PresentationDefinition {
  @ApiProperty({ example: "44d1f3d6-f65d-4a7c-84db-f92ba826305e" })
  @IsString()
  id!: string;

  @ApiProperty({ type: () => [InputDescriptor] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InputDescriptor)
  input_descriptors!: InputDescriptor[];

  @ApiPropertyOptional({ example: "Example Presentation Definition" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Example Purpose" })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    type: () => Format,
    example: { jwt_vp: { alg: ["ES256"] } }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Format)
  format?: Format;
}

export class Constraint {
  @ApiPropertyOptional({
    type: () => [Field],
    example: [
      {
        path: ["$.example"],
        id: "example-field",
        purpose: "Example purpose",
        name: "Example Name",
        filter: { type: "string", pattern: "^[A-Za-z]+$" },
        optional: false
      }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Field)
  fields?: Field[];

  @ApiPropertyOptional({
    enum: ["required", "preferred"],
    example: "preferred"
  })
  @IsOptional()
  @IsEnum(["required", "preferred"])
  limit_disclosure?: "required" | "preferred";
}

export class InputDescriptor {
  @ApiProperty({ example: "44d1f3d6-f65d-4a7c-84db-f92ba826305e" })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ example: "Example Input Descriptor" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Example Purpose" })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    type: () => Format,
    example: { jwt_vp: { alg: ["ES256"] } }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Format)
  format?: Format;

  @ApiProperty({
    type: () => Constraint,
    example: { fields: [], limit_disclosure: "preferred" }
  })
  @ValidateNested()
  @Type(() => Constraint)
  constraints!: Constraint;
}

export class FilterItems {
  @ApiPropertyOptional({ example: "example-const" })
  @IsOptional()
  const?: number | string;

  @ApiPropertyOptional({ type: () => [Number, String], example: [1, "two"] })
  @IsOptional()
  @IsArray()
  enum?: Array<number | string>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  exclusiveMinimum?: number | string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  exclusiveMaximum?: number | string;

  @ApiPropertyOptional({ example: "date-time" })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  minLength?: number;

  @ApiPropertyOptional({ example: 255 })
  @IsOptional()
  maxLength?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  minimum?: number | string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  maximum?: number | string;

  @ApiPropertyOptional({ type: () => FilterItems, example: null })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterItems)
  not?: FilterItems;

  @ApiPropertyOptional({ example: "^[A-Za-z]+$" })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({ type: () => FilterItems, example: null })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterItems)
  contains?: FilterItems;

  @ApiPropertyOptional({
    example: { property: { type: "string", format: "default" } }
  })
  @IsOptional()
  @IsObject()
  items?: Record<string, Filter>;
}

export class Filter extends FilterItems {
  @ApiProperty({ example: "string" })
  @IsString()
  type!: string;
}

export class Field {
  @ApiProperty({ type: [String], example: ["$.example"] })
  @IsArray()
  @IsString({ each: true })
  path!: string[];

  @ApiPropertyOptional({ example: "field-id" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: "Field purpose" })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ example: "Field name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: () => Filter,
    example: { type: "string", pattern: "^[A-Za-z]+$" }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Filter)
  filter?: Filter;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}

export class PresentationSubmission {
  @ApiProperty({ example: "submission-id" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "definition-id" })
  @IsString()
  definition_id!: string;

  @ApiProperty({
    type: () => [DescriptorMap],
    example: [
      {
        id: "desc1",
        format: "jwt",
        path: "$.credential"
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescriptorMap)
  descriptor_map!: DescriptorMap[];
}

export class PresentationResponse {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" })
  @IsString()
  vp_token!: string;

  @ApiProperty({
    type: () => PresentationSubmission,
    example: {
      id: "submission-id",
      definition_id: "definition-id",
      descriptor_map: []
    }
  })
  @ValidateNested()
  @Type(() => PresentationSubmission)
  presentation_submission!: PresentationSubmission;
}

export class DescriptorMap {
  @ApiProperty({ example: "desc1" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "jwt" })
  @IsString()
  format!: string;

  @ApiProperty({ example: "$.credential" })
  @IsString()
  path!: string;

  @ApiPropertyOptional({
    type: () => DescriptorMap,
    example: { id: "desc-nested", format: "jwt", path: "$.nested" }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DescriptorMap)
  path_nested?: DescriptorMap;
}

export class PresentationAuthorizationRequest {
  @ApiProperty({ example: "client123" })
  @IsString()
  client_id!: string;

  @ApiProperty({ example: "https://client.example.com/callback" })
  @IsString()
  response_uri!: string;

  @ApiProperty({ example: "vp_token" })
  @IsString()
  @IsIn(["vp_token"])
  response_type = "vp_token";

  @ApiProperty({ example: "direct_post" })
  @IsString()
  @IsIn(["direct_post"])
  response_mode = "direct_post";

  @ApiProperty({ example: { id: "pd1", input_descriptors: [] } })
  @IsString()
  presentation_definition!: PresentationDefinition;

  @ApiProperty({ example: "nonce123" })
  @IsString()
  nonce!: string;

  @ApiProperty({ example: "state123" })
  @IsString()
  state!: string;
}

export class AuthorizationResponse extends PresentationResponse {
  @ApiProperty({ example: "state123" })
  @IsString()
  state!: string;
}
