import {
  valueToBoolean,
  DatabaseConfig,
  SQLiteConfig,
  PostgresConfig,
  ServerConfig,
  AuthConfig
} from "@tsg-dsp/common-api";
import { OfferDto } from "@tsg-dsp/common-dsp";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested
} from "class-validator";
import "reflect-metadata";

export class RegistryConfig {
  @IsBoolean()
  @Transform(valueToBoolean)
  public readonly useRegistry: boolean = false;

  @IsString()
  @IsOptional()
  public readonly registryUrl?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((r: RegistryConfig) => r.registryUrl !== undefined)
  public readonly registryDid?: string;

  @IsNumber()
  @Type(() => Number)
  public readonly registryIntervalInMilliseconds: number = 30000;
}

export abstract class IamConfig {
  @IsString()
  @IsIn(["tsg", "dev"])
  public readonly type!: "tsg" | "dev";

  @IsString()
  public readonly didId!: string;
}

export class DevWalletConfig extends IamConfig {
  override readonly type: "dev" = "dev" as const;
}

export class TsgWalletConfig extends IamConfig {
  override readonly type: "tsg" = "tsg" as const;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly walletUrl!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly siopUrl!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly verifyUrl!: string;

  @IsString()
  @IsOptional()
  public readonly typeFilter?: string;

  @IsString()
  @IsOptional()
  public readonly issuerFilter?: string;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly customFields?: any[];
}

export class RuntimeConfig {
  @IsString()
  @IsIn(["automatic", "semi-manual", "manual"])
  public controlPlaneInteractions: "automatic" | "semi-manual" | "manual" =
    "automatic";
  @IsString()
  public color: string = "#3B8BF6";
  @IsOptional()
  @IsString()
  lightThemeUrl?: string;
  @IsOptional()
  @IsString()
  darkThemeUrl?: string;
}

export class InitCatalog {
  @IsString()
  public readonly creator!: string;
  @IsString()
  public readonly publisher!: string;
  @IsString()
  public readonly title!: string;
  @IsString()
  public readonly description!: string;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public datasets?: string[];
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
  @IsIn(["rules", "manual"])
  public type: "rules" | "manual" = "rules";

  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public permissions?: PolicyRuleConfig[];

  @ValidateNested({ each: true })
  @Type(() => PolicyRuleConfig)
  @IsOptional()
  public prohibitions?: PolicyRuleConfig[];

  @IsOptional()
  public raw?: OfferDto;
}

export class RootConfig {
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

  @ValidateNested()
  @IsOptional()
  @Type(() => ServerConfig)
  public readonly server!: ServerConfig;

  @ValidateNested()
  @IsDefined({
    message: "OAuth2.0 configuration must be provided"
  })
  @Type(() => AuthConfig)
  public readonly auth!: AuthConfig;

  @ValidateNested()
  @Type(() => RegistryConfig)
  public readonly registry: RegistryConfig = new RegistryConfig();

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

  @ValidateNested()
  @Type(() => InitCatalog)
  @IsDefined()
  public readonly initCatalog!: InitCatalog;

  @ValidateNested()
  @Type(() => PolicyConfig)
  @IsOptional()
  public readonly defaultPolicy: PolicyConfig = new PolicyConfig();

  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;
}
