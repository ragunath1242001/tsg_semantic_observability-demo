import { DatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import {
  plainToInstance,
  Transform,
  TransformFnParams,
  Type,
} from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsDefined,
  IsUrl,
  IsIn,
  IsBoolean,
  ValidateIf
} from "class-validator";

const valueToBoolean = (params: TransformFnParams): boolean | undefined => {
  if (params.value === null || params.value === undefined) {
    return undefined;
  }
  if (typeof params.value === "boolean") {
    return params.value;
  }
  if (["true", "on", "yes", "1"].includes(params.value.toLowerCase())) {
    return true;
  }
  if (["false", "off", "no", "0"].includes(params.value.toLowerCase())) {
    return false;
  }
  return undefined;
};

export class SSLConfig {
  @Transform(valueToBoolean)
  @IsBoolean()
  public readonly rejectUnauthorized: boolean = false;
}

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
  @Type(() => Number)
  public readonly port!: number;
  @IsString()
  public readonly username!: string;
  @IsString()
  public readonly password!: string;
  @ValidateIf((o) => typeof o.ssl === "object")
  @ValidateNested() // Only validate as nested if it's an object (SSLConfig)
  @Transform(({ value }) => {
    // Check if `value` is an object with `rejectUnauthorized` property
    if (value && typeof value === "object" && "rejectUnauthorized" in value) {
      // If value has `rejectUnauthorized`, transform it to an SSLConfig instance
      return plainToInstance(SSLConfig, value);
    } else {
      // Otherwise, set it to `false`
      return false;
    }
  })
  public readonly ssl: SSLConfig | boolean = false;
}

export class ServerConfig {
  @IsString()
  public readonly listen: string = "0.0.0.0";
  @IsNumber()
  @Type()
  @Type(() => Number)
  public readonly port: number = 3001;
  @IsString()
  public readonly publicDomain: string = "localhost";
  @IsString()
  public readonly publicAddress: string = `http://localhost:3001`;
}

export class AuthConfig {
  @IsBoolean()
  @Transform(valueToBoolean)
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
  public readonly clientId!: string;
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

export class ControlPlaneConfig {
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly dataPlaneEndpoint!: string;
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly managementEndpoint!: string;
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly controlEndpoint!: string;
  // @IsString()
  // public readonly authorization!: string;
  @IsNumber()
  @Type(() => Number)
  public readonly initializationDelay: number = 5000;
}

export class LoggingConfig {
  @IsBoolean()
  @IsOptional()
  public readonly debug: boolean = false;
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
  @IsDefined({
    message: "OAuth2.0 configuration must be provided"
  })
  @Type(() => AuthConfig)
  public readonly auth!: AuthConfig;

  @ValidateNested()
  @IsOptional()
  @Type(() => ServerConfig)
  public readonly server: ServerConfig = new ServerConfig();

  @ValidateNested()
  @IsDefined()
  @Type(() => ControlPlaneConfig)
  public readonly controlPlane!: ControlPlaneConfig;

  @ValidateNested()
  @Type(() => DatasetConfig)
  @IsOptional()
  public readonly dataset?: DatasetConfig;

  @ValidateNested()
  @Type(() => LoggingConfig)
  @IsOptional()
  public readonly logging: LoggingConfig = new LoggingConfig();
}
