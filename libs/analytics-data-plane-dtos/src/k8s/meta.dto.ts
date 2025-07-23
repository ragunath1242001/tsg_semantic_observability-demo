import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class TimeDto {
  @ApiProperty({
    description:
      "Time is a wrapper around time.Time which supports correct marshaling to YAML and JSON."
  })
  @IsString()
  @IsOptional()
  format?: string;
}

export class ManagedFieldsEntryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiVersion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fieldsType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  fieldsV1?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  manager?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  operation?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subresource?: string;

  @ApiProperty({ required: false })
  @Type(() => TimeDto)
  @ValidateNested()
  @IsOptional()
  time?: TimeDto;
}

export class OwnerReferenceDto {
  @ApiProperty()
  @IsString()
  apiVersion!: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  blockOwnerDeletion?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  controller?: boolean;

  @ApiProperty()
  @IsString()
  kind!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  uid!: string;
}

export class ObjectMetaDto {
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  annotations?: Record<string, any>;

  @ApiProperty({ required: false })
  @Type(() => TimeDto)
  @ValidateNested()
  @IsOptional()
  creationTimestamp?: TimeDto;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  deletionGracePeriodSeconds?: number;

  @ApiProperty({ required: false })
  @Type(() => TimeDto)
  @ValidateNested()
  @IsOptional()
  deletionTimestamp?: TimeDto;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  finalizers?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  generateName?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  generation?: number;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @ApiProperty({ required: false, type: [ManagedFieldsEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManagedFieldsEntryDto)
  @IsOptional()
  managedFields?: ManagedFieldsEntryDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  namespace?: string;

  @ApiProperty({ required: false, type: [OwnerReferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OwnerReferenceDto)
  @IsOptional()
  ownerReferences?: OwnerReferenceDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resourceVersion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  selfLink?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  uid?: string;
}
