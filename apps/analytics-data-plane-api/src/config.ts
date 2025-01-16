import {
  valueToBoolean,
  DatabaseConfig,
  SQLiteConfig,
  PostgresConfig,
  AuthConfig,
  ServerConfig
} from "@tsg-dsp/common-api";
import { DatasetDto } from "@tsg-dsp/common-dsp";
import { Transform, Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsDefined,
  IsUrl,
  IsBoolean,
  IsArray
} from "class-validator";

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
  @IsNumber()
  @Type(() => Number)
  public readonly initializationDelay: number = 5000;
}

export class LoggingConfig {
  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
  public readonly debug: boolean = false;
}

export class FilesConfig {
  @IsString()
  @IsOptional()
  public path: string = "/uploads";
}

export class RuntimeConfig {
  @IsString()
  public color: string = "#3B8BF6";
  @IsOptional()
  @IsString()
  lightThemeUrl?: string;
  @IsOptional()
  @IsString()
  darkThemeUrl?: string;
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

  @IsOptional()
  @IsArray()
  public readonly dataset?: DatasetDto[];

  @ValidateNested()
  @Type(() => LoggingConfig)
  @IsOptional()
  public readonly logging: LoggingConfig = new LoggingConfig();

  @ValidateNested()
  @Type(() => FilesConfig)
  @IsOptional()
  public readonly files: FilesConfig = new FilesConfig();

  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;
}
