import "reflect-metadata";

import {
  AuditModuleConfig,
  AuthConfig,
  DatabaseConfig,
  Description,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig,
  valueToBoolean
} from "@tsg-dsp/common-api";
import { OfferDto } from "@tsg-dsp/common-dsp";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested
} from "class-validator";

export class RegistryConfig {
  @Description("Use registry to crawl catalogs")
  @IsBoolean()
  @Transform(valueToBoolean)
  public readonly useRegistry: boolean = false;

  @Description("URL of the registry")
  @IsString()
  @IsOptional()
  public readonly registryUrl?: string;

  @Description("DID of the registry")
  @IsString()
  @IsOptional()
  @ValidateIf((r: RegistryConfig) => r.registryUrl !== undefined)
  public readonly registryDid?: string;

  @Description("Interval in milliseconds to fetch registry")
  @IsNumber()
  @Type(() => Number)
  public readonly registryIntervalInMilliseconds: number = 30000;
}

export class SemanticObservabilityConfig {
  @Description("Enable automatic semantic observability snapshot refresh")
  @IsBoolean()
  @Transform(valueToBoolean)
  @IsOptional()
  public readonly enabled: boolean = true;

  @Description(
    "Interval in milliseconds to refresh semantic observability snapshots"
  )
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  public readonly refreshIntervalInMilliseconds: number = 3600000;
}

export abstract class IamConfig {
  @Description("Type of IAM service")
  @IsString()
  @IsIn(["tsg", "dev"])
  public readonly type!: "tsg" | "dev";

  @Description("DID identifier of the IAM service")
  @IsString()
  public readonly didId!: string;

  @Description("Protocol of the IAM service")
  @IsString()
  public readonly protocol: string = "DCP";

  @Description("Protocol of the IAM service")
  @IsString()
  public readonly version: string = "1.0";

  @Description("Profiles of the IAM service")
  @IsString({ each: true })
  public readonly profile: string[] = ["vc11-bssl/jsonld"];
}

export class DevWalletConfig extends IamConfig {
  override readonly type: "dev" = "dev" as const;
}

export class TsgWalletConfig extends IamConfig {
  override readonly type: "tsg" = "tsg" as const;

  @Description("URL of the wallet management endpoint")
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly walletUrl!: string;

  @Description("URL of the SIOP token endpoint")
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly siopUrl!: string;

  @Description("URL of the verification endpoint")
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly verifyUrl!: string;

  @Description("Credential type filter used as default")
  @IsString()
  @IsOptional()
  public readonly typeFilter?: string;

  @Description("Issuer filter used as default")
  @IsString()
  @IsOptional()
  public readonly issuerFilter?: string;

  @Description("Custom presentation definition fields")
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly customFields?: any[];
}

export class RuntimeConfig {
  @Description("Mode of control plane interactions")
  @IsString()
  @IsIn(["automatic", "semi-manual", "manual"])
  public controlPlaneInteractions: "automatic" | "semi-manual" | "manual" =
    "automatic";
  @Description("Primary UI color")
  @IsString()
  public color: string = "#3B8BF6";
  @Description("Light theme logo URL")
  @IsOptional()
  @IsString()
  lightThemeUrl?: string;
  @Description("Dark theme logo URL")
  @IsOptional()
  @IsString()
  darkThemeUrl?: string;
}

export class InitCatalog {
  @Description("Participant id of the catalog")
  @IsString()
  public readonly participantId!: string;
  @Description("Creator of the catalog")
  @IsString()
  public readonly creator!: string;
  @Description("Publisher of the catalog")
  @IsString()
  public readonly publisher!: string;
  @Description("Title of the catalog")
  @IsString()
  public readonly title!: string;
  @Description("Description of the catalog")
  @IsString()
  public readonly description!: string;
  @Description("Serialized initial datasets")
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public datasets?: string[];
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
  @IsIn(["rules", "manual"])
  public type: "rules" | "manual" = "rules";

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

  @Description("Raw ODRL policy")
  @IsOptional()
  @IsObject()
  public raw?: OfferDto;
}

export class RootConfig {
  @Description("Database configuration")
  @ValidateNested()
  @IsDefined({
    message: "Either sqlite or postgres DB config must be provided"
  })
  @Type(() => DatabaseConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: SQLiteConfig, name: "sqlite" },
        { value: PostgresConfig, name: "postgres" }
      ]
    }
  })
  public readonly db!: DatabaseConfig;

  @Description("Server configuration")
  @ValidateNested()
  @IsOptional()
  @Type(() => ServerConfig)
  public readonly server!: ServerConfig;

  @Description("Management authentication configuration")
  @ValidateNested()
  @IsDefined({
    message: "Auth configuration must be provided"
  })
  @Type(() => AuthConfig)
  public readonly auth!: AuthConfig;

  @Description("Registry configuration")
  @ValidateNested()
  @Type(() => RegistryConfig)
  public readonly registry: RegistryConfig = new RegistryConfig();

  @Description("IAM wallet configuration")
  @ValidateNested()
  @Type(() => IamConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: DevWalletConfig, name: "dev" },
        { value: TsgWalletConfig, name: "tsg" }
      ]
    }
  })
  @IsDefined()
  public readonly iam!: IamConfig;

  @Description("Initial catalog configuration")
  @ValidateNested()
  @Type(() => InitCatalog)
  @IsDefined()
  public readonly initCatalog!: InitCatalog;

  @Description("Default policy configuration")
  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public readonly defaultPolicy: PolicyConfig = new PolicyConfig();

  @Description("Runtime configuration")
  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;

  @Description("Audit logging configuration")
  @ValidateNested()
  @Type(() => AuditModuleConfig)
  @IsOptional()
  public readonly audit: AuditModuleConfig = new AuditModuleConfig();

  @Description("Semantic observability configuration")
  @ValidateNested()
  @Type(() => SemanticObservabilityConfig)
  @IsOptional()
  public readonly semanticObservability: SemanticObservabilityConfig =
    new SemanticObservabilityConfig();
}
