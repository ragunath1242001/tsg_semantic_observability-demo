import "reflect-metadata";

import { DatasetDto, OfferDto } from "@tsg-dsp/common-dsp";
import { plainToInstance, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  registerDecorator,
  ValidateNested,
  ValidationOptions,
  ValidatorOptions
} from "class-validator";

export function Description(
  description: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "description",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [description],
      options: validationOptions,
      validator: {
        validate() {
          return true;
        }
      }
    });
  };
}

export class RuleConstraintConfig {
  @Description("Type of the constraint")
  @IsString()
  @IsDefined()
  public type!: string;

  @Description("Value of the constraint")
  @IsString()
  @IsDefined()
  public value!: string;
}

export class PolicyRuleConfig {
  @Description("Action of the rule")
  @IsString()
  @IsDefined()
  public action!: string;

  @Description("Constraints of the rule")
  @ValidateNested({ each: true })
  @Type(() => RuleConstraintConfig)
  @IsOptional()
  public constraints?: RuleConstraintConfig[];
}

export class PolicyConfig {
  @Description("Definition type of the policy")
  @IsString()
  @IsIn(["default", "rules", "manual"])
  public type: "default" | "rules" | "manual" = "default";

  @Description("Permissions of the policy")
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public permissions?: PolicyRuleConfig[];

  @Description("Prohibitions of the policy")
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public prohibitions?: PolicyRuleConfig[];

  @Description("Raw serialized ODRL offer")
  @IsOptional()
  @IsObject()
  public raw?: OfferDto;
}

export class DistributionConfig {
  @Description("Media type of the distribution")
  @IsString()
  @IsOptional()
  public mediaType?: string;

  @Description("Schema reference of the distribution")
  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef?: string;

  @Description("OpenAPI specification reference of the distribution")
  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef?: string;

  @Description("Backend URL of the distribution")
  @IsString()
  @IsUrl({ require_tld: false })
  public backendUrl!: string;
}

export class VersionConfig {
  @Description("Version ID")
  @IsString()
  @IsOptional()
  public id?: string;
  @Description("Version number")
  @IsString()
  public version!: string;

  @Description("Semantic model reference of the version")
  @IsString()
  @IsOptional()
  @IsUrl()
  public semanticModelRef?: string;

  @Description("Authorization header required for the backend")
  @IsString()
  @IsOptional()
  public authorization?: string;

  @Description("Distributions of the version")
  @ValidateNested()
  @Type(() => DistributionConfig)
  @ArrayNotEmpty()
  @ArrayMaxSize(1, { message: "currently only one distribution is supported" })
  public distributions!: DistributionConfig[];
}

export abstract class DatasetConfig {
  @Description("Type of the dataset configuration")
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

  @Description("ID of the dataset")
  @IsString()
  @IsOptional()
  public id?: string;

  @Description("Title of the dataset")
  @IsString()
  @IsDefined()
  public title!: string;

  @Description("Base semantic model reference of the dataset")
  @IsString()
  @IsOptional()
  @IsUrl()
  public baseSemanticModelRef?: string;

  @Description("Versions of the dataset")
  @ValidateNested()
  @Type(() => VersionConfig)
  @ArrayMinSize(1)
  public versions!: VersionConfig[];

  @Description("Current version of the dataset")
  @IsString()
  @IsDefined()
  public currentVersion!: string;

  @Description("Policy of the dataset")
  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public policy?: PolicyConfig;
}

export class CollectionDatasetConfig extends DatasetConfig {
  override type: "collection" = "collection" as const;

  @Description("Base semantic model reference of the dataset")
  @IsString()
  @IsOptional()
  @IsUrl()
  public baseSemanticModelRef?: string;

  @Description("Base policy of the dataset")
  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public basePolicy?: PolicyConfig;

  @Description("Authorization header required for the backend")
  @IsString()
  @IsOptional()
  public authorization?: string;

  @Description("Media type of the dataset")
  @IsString()
  @IsOptional()
  public mediaType?: string;

  @Description("Schema reference of the dataset")
  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef?: string;

  @Description("OpenAPI specification reference of the dataset")
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
  @Description("ID of the dataset item")
  @IsString()
  @IsOptional()
  public id!: string | null;

  @Description("Title of the dataset item")
  @IsString()
  @IsDefined()
  public title!: string;

  @Description("Version of the dataset item")
  @IsString()
  @IsDefined()
  public version!: string;

  @Description("Base semantic model reference of the dataset item")
  @IsString()
  @IsUrl({ require_tld: false })
  public backendUrl!: string;

  @Description("Authorization header required for the backend")
  @IsString()
  @IsOptional()
  public authorization!: string | null;

  @Description("Media type of the dataset item")
  @IsString()
  @IsOptional()
  public mediaType!: string | null;

  @Description("Schema reference of the dataset item")
  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef!: string | null;

  @Description("OpenAPI specification reference of the dataset")
  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef!: string | null;

  @Description("Policy of the dataset item")
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
