import "reflect-metadata";
import { DatasetDto, OfferDto } from "@tsg-dsp/common-dsp";
import { plainToInstance, Type } from "class-transformer";
import {
  IsString,
  IsDefined,
  ValidateNested,
  IsIn,
  IsOptional,
  ArrayMinSize,
  IsUrl,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsObject,
  ValidatorOptions
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

  @IsOptional()
  @IsObject()
  public raw?: OfferDto;
}

export class DistributionConfig {
  @IsString()
  @IsOptional()
  public mediaType?: string;

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

export abstract class DatasetConfig {
  @IsString()
  @IsIn(["versioned", "collection"])
  @IsDefined()
  public type!: "versioned" | "collection";

  static parse(
    plain: any,
    validator?: (
      object: DatasetConfig,
      validatorOptions?: ValidatorOptions
    ) => DatasetConfig
  ): DatasetConfig {
    const wrapper = plainToInstance(DatasetConfigWrapper, {
      datasetConfig: plain
    });
    if (validator) {
      validator(wrapper.datasetConfig);
    }
    return wrapper.datasetConfig;
  }
}

export class VersionedDatasetConfig extends DatasetConfig {
  override type: "versioned" = "versioned" as const;

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

export class CollectionDatasetConfig extends DatasetConfig {
  override type: "collection" = "collection" as const;

  @IsString()
  @IsOptional()
  @IsUrl()
  public baseSemanticModelRef?: string;

  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public basePolicy?: PolicyConfig;

  @IsString()
  @IsOptional()
  public authorization?: string;

  @IsString()
  @IsOptional()
  public mediaType?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef?: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef?: string;
}

export class DatasetConfigWrapper {
  @ValidateNested()
  @Type(() => DatasetConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: VersionedDatasetConfig, name: "versioned" },
        { value: CollectionDatasetConfig, name: "collection" }
      ]
    }
  })
  @IsDefined()
  public datasetConfig!: DatasetConfig;
}

export class DatasetItem {
  @IsString()
  @IsOptional()
  public id!: string | null;

  @IsString()
  @IsDefined()
  public title!: string;

  @IsString()
  @IsDefined()
  public version!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  public backendUrl!: string;

  @IsString()
  @IsOptional()
  public authorization!: string | null;

  @IsString()
  @IsOptional()
  public mediaType!: string | null;

  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef!: string | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef!: string | null;

  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public policy!: PolicyConfig[] | null;
}

export class DatasetItemWithDto extends DatasetItem {
  @IsObject()
  @IsOptional()
  public dataset!: DatasetDto | null;
}
