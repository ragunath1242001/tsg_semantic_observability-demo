import {
  valueToBoolean,
  DatabaseConfig,
  SQLiteConfig,
  PostgresConfig,
  AuthConfig,
  ServerConfig,
  Description
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
  @Description("Data plane management endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly dataPlaneEndpoint!: string;
  @Description("Control plane management endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly managementEndpoint!: string;
  @Description("Public control plane endpoint")
  @IsString()
  @IsUrl({ require_tld: false })
  public readonly controlEndpoint!: string;
  @Description("Initialization delay in milliseconds")
  @IsNumber()
  @Type(() => Number)
  public readonly initializationDelay: number = 5000;
}

export class LoggingConfig {
  @Description("Enable debug request logging")
  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
  public readonly debug: boolean = false;
}

export class FilesConfig {
  @Description("Path to store uploaded files")
  @IsString()
  @IsOptional()
  public path: string = "/uploads";
}

export class RuntimeConfig {
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
  public readonly server: ServerConfig = new ServerConfig();

  @Description("Management authentication configuration")
  @ValidateNested()
  @IsDefined({
    message: "Auth configuration must be provided"
  })
  @Type(() => AuthConfig)
  public readonly auth!: AuthConfig;

  @Description("Control plane configuration")
  @ValidateNested()
  @IsDefined()
  @Type(() => ControlPlaneConfig)
  public readonly controlPlane!: ControlPlaneConfig;

  @Description("Dataset configuration")
  @IsOptional()
  @IsArray()
  public readonly dataset?: DatasetDto[];

  @Description("Logging configuration")
  @ValidateNested()
  @Type(() => LoggingConfig)
  @IsOptional()
  public readonly logging: LoggingConfig = new LoggingConfig();

  @Description("Files configuration")
  @ValidateNested()
  @Type(() => FilesConfig)
  @IsOptional()
  public readonly files: FilesConfig = new FilesConfig();

  @Description("Runtime configuration")
  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;
}
