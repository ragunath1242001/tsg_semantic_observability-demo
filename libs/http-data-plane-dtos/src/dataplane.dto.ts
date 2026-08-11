import "reflect-metadata";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  @ApiProperty({
    description: "Type of the constraint",
    example: "CredentialType"
  })
  @Description("Type of the constraint")
  @IsString()
  @IsDefined()
  public type!: string;

  @ApiProperty({
    description: "Value of the constraint",
    example: "MembershipCredential"
  })
  @Description("Value of the constraint")
  @IsString()
  @IsDefined()
  public value!: string;
}

export class PolicyRuleConfig {
  @ApiProperty({ description: "Action of the rule", example: "use" })
  @Description("Action of the rule")
  @IsString()
  @IsDefined()
  public action!: string;

  @ApiPropertyOptional({
    description: "Constraints of the rule",
    type: () => [RuleConstraintConfig]
  })
  @Description("Constraints of the rule")
  @ValidateNested({ each: true })
  @Type(() => RuleConstraintConfig)
  @IsOptional()
  public constraints?: RuleConstraintConfig[];
}

export class PolicyConfig {
  @ApiProperty({
    description: "Definition type of the policy",
    enum: ["default", "rules", "manual"],
    default: "default"
  })
  @Description("Definition type of the policy")
  @IsString()
  @IsIn(["default", "rules", "manual"])
  public type: "default" | "rules" | "manual" = "default";

  @ApiPropertyOptional({
    description: "Permissions of the policy",
    type: () => [PolicyRuleConfig]
  })
  @Description("Permissions of the policy")
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public permissions?: PolicyRuleConfig[];

  @ApiPropertyOptional({
    description: "Prohibitions of the policy",
    type: () => [PolicyRuleConfig]
  })
  @Description("Prohibitions of the policy")
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public prohibitions?: PolicyRuleConfig[];

  @ApiPropertyOptional({ description: "Raw serialized ODRL offer" })
  @Description("Raw serialized ODRL offer")
  @IsOptional()
  @IsObject()
  public raw?: OfferDto;
}

export class DistributionConfig {
  @ApiPropertyOptional({
    description: "Media type of the distribution",
    example: "application/json"
  })
  @Description("Media type of the distribution")
  @IsString()
  @IsOptional()
  public mediaType?: string;

  @ApiPropertyOptional({
    description: "Schema reference of the distribution",
    example: "https://example.com/schema.json"
  })
  @Description("Schema reference of the distribution")
  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef?: string;

  @ApiPropertyOptional({
    description: "OpenAPI specification reference of the distribution",
    example: "https://example.com/openapi.yaml"
  })
  @Description("OpenAPI specification reference of the distribution")
  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef?: string;

  @ApiProperty({
    description: "Backend URL of the distribution",
    example: "http://internal:3000"
  })
  @Description("Backend URL of the distribution")
  @IsString()
  @IsUrl({ require_tld: false })
  public backendUrl!: string;
}

export class VersionConfig {
  @ApiPropertyOptional({
    description: "Version ID",
    example: "urn:uuid:123e4567-e89b-12d3-a456-426614174000"
  })
  @Description("Version ID")
  @IsString()
  @IsOptional()
  public id?: string;

  @ApiProperty({ description: "Version number", example: "1.0.0" })
  @Description("Version number")
  @IsString()
  public version!: string;

  @ApiPropertyOptional({
    description: "Semantic model reference of the version",
    example: "https://example.com/model"
  })
  @Description("Semantic model reference of the version")
  @IsString()
  @IsOptional()
  @IsUrl()
  public semanticModelRef?: string;

  @ApiPropertyOptional({
    description: "Authorization header required for the backend",
    example: "Bearer token"
  })
  @Description("Authorization header required for the backend")
  @IsString()
  @IsOptional()
  public authorization?: string;

  @ApiProperty({
    description: "Distributions of the version",
    type: () => [DistributionConfig]
  })
  @Description("Distributions of the version")
  @ValidateNested()
  @Type(() => DistributionConfig)
  @ArrayNotEmpty()
  @ArrayMaxSize(1, { message: "currently only one distribution is supported" })
  public distributions!: DistributionConfig[];

  @ApiPropertyOptional({
    description: "Additional DCAT properties for this version",
    example: { "dcat:keyword": ["example"] }
  })
  @Description("Additional DCAT properties for this version")
  @IsObject()
  @IsOptional()
  public extraProps?: Record<string, unknown>;
}

export abstract class DatasetConfig {
  @ApiProperty({
    description: "Type of the dataset configuration",
    enum: ["versioned", "collection"]
  })
  @Description("Type of the dataset configuration")
  @IsString()
  @IsIn(["versioned", "collection"])
  @IsDefined()
  public type!: "versioned" | "collection";

  @ApiPropertyOptional({
    description:
      "Whether to validate extraProps for unknown prefixes and unresolvable keys. Defaults to 'error'.",
    enum: ["error", "warn", "ignore"],
    default: "error"
  })
  @Description(
    "Whether to validate extraProps for unknown prefixes and unresolvable keys. Defaults to 'error'."
  )
  @IsOptional()
  @IsIn(["error", "warn", "ignore"])
  public validateExtraProps: "error" | "warn" | "ignore" = "error";

  @ApiPropertyOptional({
    description:
      "Public SDO-governed standard identifier used only for aggregate observability"
  })
  @Description(
    "Public SDO-governed standard identifier used only for aggregate observability"
  )
  @IsString()
  @IsOptional()
  public governedStandardId?: string;

  @ApiPropertyOptional({
    description:
      "Public governed semantic field identifiers whose presence may be counted",
    type: [String]
  })
  @Description(
    "Public governed semantic field identifiers whose presence may be counted"
  )
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsOptional()
  public governedFieldIds?: string[];

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

  @ApiPropertyOptional({
    description: "ID of the dataset",
    example: "urn:uuid:123e4567-e89b-12d3-a456-426614174000"
  })
  @Description("ID of the dataset")
  @IsString()
  @IsOptional()
  public id?: string;

  @ApiProperty({
    description: "Title of the dataset",
    example: "Example Dataset"
  })
  @Description("Title of the dataset")
  @IsString()
  @IsDefined()
  public title!: string;

  @ApiPropertyOptional({
    description: "Description of the dataset",
    type: [String]
  })
  @Description("Description of the dataset")
  @IsString({ each: true })
  @IsOptional()
  public description?: string[];

  @ApiPropertyOptional({
    description: "Landing Page of the dataset",
    example: "https://example.com/dataset"
  })
  @Description("Landing Page of the dataset")
  @IsString()
  @IsOptional()
  public landingPage?: string;

  @ApiPropertyOptional({
    description: "Base semantic model reference of the dataset",
    example: "https://example.com/model"
  })
  @Description("Base semantic model reference of the dataset")
  @IsString()
  @IsOptional()
  @IsUrl()
  public baseSemanticModelRef?: string;

  @ApiProperty({
    description: "Versions of the dataset",
    type: () => [VersionConfig]
  })
  @Description("Versions of the dataset")
  @ValidateNested()
  @Type(() => VersionConfig)
  @ArrayMinSize(1)
  public versions!: VersionConfig[];

  @ApiProperty({
    description: "Current version of the dataset",
    example: "1.0.0"
  })
  @Description("Current version of the dataset")
  @IsString()
  @IsDefined()
  public currentVersion!: string;

  @ApiPropertyOptional({
    description: "Policy of the dataset",
    type: () => PolicyConfig
  })
  @Description("Policy of the dataset")
  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public policy?: PolicyConfig;

  @ApiPropertyOptional({
    description: "Additional DCAT properties for the dataset",
    example: { "dcat:keyword": ["example"] }
  })
  @Description("Additional DCAT properties for the dataset")
  @IsObject()
  @IsOptional()
  public extraProps?: Record<string, unknown>;
}

export class CollectionDatasetConfig extends DatasetConfig {
  override type: "collection" = "collection" as const;

  @ApiPropertyOptional({
    description: "Landing Page of the dataset",
    example: "https://example.com/dataset"
  })
  @Description("Landing Page of the dataset")
  @IsString()
  @IsOptional()
  public landingPage?: string;

  @ApiPropertyOptional({
    description: "Base semantic model reference of the dataset",
    example: "https://example.com/model"
  })
  @Description("Base semantic model reference of the dataset")
  @IsString()
  @IsOptional()
  @IsUrl()
  public baseSemanticModelRef?: string;

  @ApiPropertyOptional({
    description: "Base policy of the dataset",
    type: () => PolicyConfig
  })
  @Description("Base policy of the dataset")
  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public basePolicy?: PolicyConfig;

  @ApiPropertyOptional({
    description: "Authorization header required for the backend",
    example: "Bearer token"
  })
  @Description("Authorization header required for the backend")
  @IsString()
  @IsOptional()
  public authorization?: string;

  @ApiPropertyOptional({
    description: "Media type of the dataset",
    example: "application/json"
  })
  @Description("Media type of the dataset")
  @IsString()
  @IsOptional()
  public mediaType?: string;

  @ApiPropertyOptional({
    description: "Schema reference of the dataset",
    example: "https://example.com/schema.json"
  })
  @Description("Schema reference of the dataset")
  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef?: string;

  @ApiPropertyOptional({
    description: "OpenAPI specification reference of the dataset",
    example: "https://example.com/openapi.yaml"
  })
  @Description("OpenAPI specification reference of the dataset")
  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef?: string;

  @ApiPropertyOptional({
    description: "Additional DCAT properties for the dataset",
    example: { "dcat:keyword": ["example"] }
  })
  @Description("Additional DCAT properties for the dataset")
  @IsObject()
  @IsOptional()
  public extraProps?: Record<string, unknown>;
}

export class DatasetConfigWrapper {
  @ApiProperty({ description: "The dataset configuration" })
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
  @ApiPropertyOptional({
    description: "ID of the dataset item",
    nullable: true
  })
  @Description("ID of the dataset item")
  @IsString()
  @IsOptional()
  public id!: string | null;

  @ApiProperty({
    description: "Title of the dataset item",
    example: "Example Dataset"
  })
  @Description("Title of the dataset item")
  @IsString()
  @IsDefined()
  public title!: string;

  @ApiPropertyOptional({
    description: "Description of the dataset",
    type: [String]
  })
  @Description("Description of the dataset")
  @IsString({ each: true })
  @IsOptional()
  public description?: string[];

  @ApiProperty({ description: "Version of the dataset item", example: "1.0.0" })
  @Description("Version of the dataset item")
  @IsString()
  @IsDefined()
  public version!: string;

  @ApiProperty({
    description: "Backend URL of the dataset item",
    example: "http://localhost:3000"
  })
  @Description("Base semantic model reference of the dataset item")
  @IsString()
  @IsUrl({ require_tld: false })
  public backendUrl!: string;

  @ApiPropertyOptional({
    description: "Authorization header required for the backend"
  })
  @Description("Authorization header required for the backend")
  @IsString()
  @IsOptional()
  public authorization!: string | null;

  @ApiPropertyOptional({
    description: "Media type of the dataset item",
    example: "application/json"
  })
  @Description("Media type of the dataset item")
  @IsString()
  @IsOptional()
  public mediaType!: string | null;

  @ApiPropertyOptional({
    description: "Schema reference of the dataset item"
  })
  @Description("Schema reference of the dataset item")
  @IsString()
  @IsOptional()
  @IsUrl()
  public schemaRef!: string | null;

  @ApiPropertyOptional({
    description: "OpenAPI specification reference of the dataset"
  })
  @Description("OpenAPI specification reference of the dataset")
  @IsString()
  @IsUrl()
  @IsOptional()
  public openApiSpecRef!: string | null;

  @ApiPropertyOptional({
    description: "Policy of the dataset item",
    type: () => [PolicyConfig]
  })
  @Description("Policy of the dataset item")
  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public policy!: PolicyConfig[] | null;

  @ApiPropertyOptional({
    description: "Additional DCAT properties for the dataset item",
    example: { "dcat:keyword": ["example"] }
  })
  @Description("Additional DCAT properties for the dataset item")
  @IsObject()
  @IsOptional()
  public extraProps!: Record<string, unknown> | null;
}

export class DatasetItemWithDto extends DatasetItem {
  @ApiPropertyOptional({
    description: "The full DCAT dataset DTO"
  })
  @IsObject()
  @IsOptional()
  public dataset!: DatasetDto | null;
}
