import { Type } from "class-transformer";
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  IsObject,
  IsBoolean,
  IsIn
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VerifiablePresentationJwt } from "@tsg-dsp/common-dsp";

export class JwtVpClaimFormat {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  alg!: string[];
}

export class Format {
  @ApiPropertyOptional({ type: () => JwtVpClaimFormat })
  @IsOptional()
  @ValidateNested()
  @Type(() => JwtVpClaimFormat)
  jwt_vp?: JwtVpClaimFormat;
}

export class PresentationDefinition {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: () => [InputDescriptor] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InputDescriptor)
  input_descriptors!: InputDescriptor[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ type: () => Format })
  @IsOptional()
  @ValidateNested()
  @Type(() => Format)
  format?: Format;
}

export class Constraint {
  @ApiPropertyOptional({ type: () => [Field] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Field)
  fields?: Field[];

  @ApiPropertyOptional({ enum: ["required", "preferred"] })
  @IsOptional()
  @IsEnum(["required", "preferred"])
  limit_disclosure?: "required" | "preferred";
}

export class InputDescriptor {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ type: () => Format })
  @IsOptional()
  @ValidateNested()
  @Type(() => Format)
  format?: Format;

  @ApiProperty({ type: () => Constraint })
  @ValidateNested()
  @Type(() => Constraint)
  constraints!: Constraint;
}

export class FilterItems {
  @ApiPropertyOptional()
  @IsOptional()
  const?: number | string;

  @ApiPropertyOptional({ type: () => [Number, String] })
  @IsOptional()
  @IsArray()
  enum?: Array<number | string>;

  @ApiPropertyOptional()
  @IsOptional()
  exclusiveMinimum?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  exclusiveMaximum?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  maxLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  minimum?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  maximum?: number | string;

  @ApiPropertyOptional({ type: () => FilterItems })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterItems)
  not?: FilterItems;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({ type: () => FilterItems })
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterItems)
  contains?: FilterItems;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  items?: Record<string, Filter>;
}

export class Filter extends FilterItems {
  @ApiProperty()
  @IsString()
  type!: string;
}

export class Field {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  path!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: () => Filter })
  @IsOptional()
  @ValidateNested()
  @Type(() => Filter)
  filter?: Filter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}

export class PresentationSubmission {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  definition_id!: string;

  @ApiProperty({ type: () => [DescriptorMap] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DescriptorMap)
  descriptor_map!: DescriptorMap[];
}

export class PresentationResponse {
  @ApiProperty()
  @IsString()
  vp_token!: string;

  @ApiProperty({ type: () => PresentationSubmission })
  @ValidateNested()
  @Type(() => PresentationSubmission)
  presentation_submission!: PresentationSubmission;
}

export class DescriptorMap {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  format!: string;

  @ApiProperty()
  @IsString()
  path!: string;

  @ApiPropertyOptional({ type: () => DescriptorMap })
  @IsOptional()
  @ValidateNested()
  @Type(() => DescriptorMap)
  path_nested?: DescriptorMap;
}

export class AuthorizationRequest {
  @ApiProperty()
  @IsString()
  client_id!: string;

  @ApiProperty()
  @IsString()
  response_uri!: string;

  @ApiProperty()
  @IsString()
  @IsIn(["vp_token"])
  response_type = "vp_token";

  @ApiProperty()
  @IsString()
  @IsIn(["direct_post"])
  response_mode = "direct_post";

  @ApiProperty()
  @IsString()
  presentation_definition!: PresentationDefinition;

  @ApiProperty()
  @IsString()
  nonce!: string;

  @ApiProperty()
  @IsString()
  state!: string;
}

export class AuthorizationResponse extends PresentationResponse {
  @ApiProperty()
  @IsString()
  state!: string;
}
