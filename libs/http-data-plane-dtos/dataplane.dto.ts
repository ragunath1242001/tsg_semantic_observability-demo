import { DataPlaneDetailsDto, DatasetDto, OfferDto } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsString,
  IsDefined,
  ValidateNested,
  IsIn,
  IsOptional,
  ArrayMinSize,
  IsUrl,
} from "class-validator";

export interface DataPlaneStateDto {
  identifier: string;
  details: DataPlaneDetailsDto;
  dataset: Array<DatasetDto>;
}

export class RuleConstraintConfig {
  @IsString()
  @IsDefined()
  public type!: string;

  @IsString()
  @IsDefined()
  public value!: string;
}

export class PolicyRuleConfig {
  @IsString()
  @IsDefined()
  public action!: string;

  @ValidateNested({ each: true })
  @Type(() => RuleConstraintConfig)
  @IsOptional()
  public constraints?: RuleConstraintConfig[];
}

export class PolicyConfig {
  @IsString()
  @IsIn(["default", "rules", "manual"])
  public type: "default" | "rules" | "manual" = "default";

  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public permissions?: PolicyRuleConfig[];

  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public prohibitions?: PolicyRuleConfig[];

  public raw?: OfferDto;
}

export class VersionConfig {
  @IsString()
  @IsOptional()
  public id?: string;

  @IsString()
  @IsUrl({ require_tld: false })
  public backend!: string;

  @IsString()
  public version!: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpec?: string;

  @IsString()
  @IsOptional()
  public authorization?: string;
}

export class DatasetConfig {
  @IsString()
  @IsOptional()
  public id?: string;

  @IsString()
  @IsDefined()
  public title!: string;

  @IsString()
  @IsOptional()
  public conformsTo?: string;

  @ValidateNested()
  @Type(() => VersionConfig)
  @ArrayMinSize(1)
  public versions!: VersionConfig[];

  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public policy?: PolicyConfig;
}
