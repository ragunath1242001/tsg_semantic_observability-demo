import { OfferDto } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsString,
  IsDefined,
  ValidateNested,
  IsIn,
  IsOptional,
  ArrayMinSize,
  IsUrl,
  IsInt,
  ArrayNotEmpty,
  Min,
  ArrayMaxSize,
} from "class-validator";

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

export class DistributionConfig {
  @IsString()
  @IsDefined()
  public format!: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef?: string;

  @IsString()
  @IsUrl({ require_tld: false })
  public backendUrl!: string;
}

export class VersionConfig {
  @IsString()
  @IsOptional()
  public id?: string;

  @IsString()
  public version!: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  public semanticModelRef?: string;

  @IsString()
  @IsOptional()
  public authorization?: string;

  @ValidateNested()
  @Type(() => DistributionConfig)
  @ArrayNotEmpty()
  @ArrayMaxSize(1, { message: "currently only one distribution is supported" })
  public distributions!: DistributionConfig[];
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
  @IsUrl()
  public baseSemanticModelRef?: string;

  @ValidateNested()
  @Type(() => VersionConfig)
  @ArrayMinSize(1)
  public versions!: VersionConfig[];

  @IsString()
  @IsDefined()
  public currentVersion!: string;

  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public policy?: PolicyConfig;
}
