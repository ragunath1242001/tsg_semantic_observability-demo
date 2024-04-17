import "reflect-metadata";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export abstract class DatabaseConfig {
  @IsString()
  @IsIn(["sqlite", "postgres"])
  public readonly type!: "sqlite" | "postgres";

  @IsString()
  public readonly database!: string;
}

export class SQLiteConfig extends DatabaseConfig {
  override readonly type: "sqlite" = "sqlite" as const;
}

export class PostgresConfig extends DatabaseConfig {
  override readonly type: "postgres" = "postgres" as const;

  @IsString()
  public readonly host!: string;
  @IsNumber()
  public readonly port!: number;
  @IsString()
  public readonly username!: string;
  @IsString()
  public readonly password!: string;
}

export class ServerConfig {
  @IsString()
  public readonly listen: string = "0.0.0.0";
  @IsNumber()
  @Type()
  public readonly port: number = 3000;
  @IsString()
  public readonly publicDomain: string = "localhost";
  @IsString()
  public readonly publicAddress: string = `http://localhost:3000`;
}

export class AuthConfig {
  @IsBoolean()
  public readonly enabled: boolean = true;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly authorizationURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly tokenURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly introspectionURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly callbackURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly redirectURL!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientID!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientSecret!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientUsername!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly clientPassword!: string;
  @ValidateIf((c) => c.enabled)
  @IsString()
  public readonly rolePath: string = "$.roles[*].name";
}

export class RegistryConfig {
  @IsBoolean()
  public readonly isRegistry: boolean = false;

  @IsString()
  @IsOptional()
  public readonly registryUrl?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((r: RegistryConfig) => r.registryUrl !== undefined)
  public readonly registryDid?: string;

  @IsNumber()
  public readonly registryIntervalInMilliseconds: number = 30000;
}

export abstract class IamConfig {
  @IsString()
  @IsIn(["tsg", "tsg-iatp", "miw", "dev"])
  public readonly type!: "tsg" | "tsg-iatp" | "miw" | "dev";

  @IsString()
  public readonly didId!: string;

  @IsString()
  public readonly clientId!: string;

  @IsString()
  public readonly clientSecret!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly tokenUrl!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly walletUrl!: string;
}

export class DevWalletConfig extends IamConfig {
  override readonly type: "dev" = "dev" as const;
}

export class TsgWalletDirectConfig extends IamConfig {
  override readonly type: "tsg" = "tsg" as const;

  @IsString()
  public readonly credentialId!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly presentationUrl!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly validationUrl!: string;

  @IsString({ each: true })
  public readonly validations!: string[];
}

export class TsgWalletIatpConfig extends IamConfig {
  override readonly type: "tsg-iatp" = "tsg-iatp" as const;

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

export class MiwConfig extends IamConfig {
  override readonly type: "miw" = "miw" as const;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly presentationUrl!: string;

  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_host: false })
  public readonly validationUrl!: string;

  @IsString()
  public readonly credentialId!: string;

  @IsString({ each: true })
  public readonly validations!: string[];
}

export class RuntimeConfig {
  @IsString()
  @IsIn(["automatic", "semi-manual", "manual"])
  public controlPlaneInteractions: "automatic" | "semi-manual" | "manual" =
    "automatic";
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

export class RootConfig {
  @ValidateNested()
  @IsDefined({
    message: "Either sqlite or postgres DB config must be provided",
  })
  @Type(() => DatabaseConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: SQLiteConfig, name: "sqlite" },
        { value: PostgresConfig, name: "postgres" },
      ],
    },
  })
  public readonly db!: DatabaseConfig;

  @ValidateNested()
  @IsOptional()
  @Type(() => ServerConfig)
  public readonly server!: ServerConfig;

  @ValidateNested()
  @IsDefined({
    message: "OAuth2.0 configuration must be provided",
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
        { value: TsgWalletDirectConfig, name: "tsg" },
        { value: TsgWalletIatpConfig, name: "tsg-iatp" },
        { value: MiwConfig, name: "miw" },
      ],
    },
  })
  @IsDefined()
  public readonly iam!: IamConfig;

  @ValidateNested()
  @Type(() => InitCatalog)
  @IsDefined()
  public readonly initCatalog!: InitCatalog;

  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;
}
