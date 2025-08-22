import {
  AuthConfig,
  DatabaseConfig,
  Description,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig
} from "@tsg-dsp/common-api";
import {
  CollectionDatasetConfig,
  DatasetConfig,
  DatasetItem,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested
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
  @IsOptional()
  @Type(() => Number)
  public readonly initializationDelay: number = 5000;
  @Description("Data Plane title")
  @IsString()
  @IsOptional()
  public readonly dataPlaneTitle: string =
    `HTTP Data Plane - ${process.env.TSG_MODE === "development" ? "dev" : `v${process.env.TSG_VERSION}`}`;
}

export class LoggingConfig {
  @Description("Enable debug request logging")
  @IsBoolean()
  @IsOptional()
  public readonly debug: boolean = false;
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
  @ValidateNested()
  @IsOptional()
  @Type(() => DatasetConfig, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: VersionedDatasetConfig, name: "versioned" },
        { value: CollectionDatasetConfig, name: "collection" }
      ]
    }
  })
  public readonly dataset?: DatasetConfig;

  @Description("Initial collection configuration")
  @ValidateNested()
  @IsOptional()
  @Type(() => DatasetItem)
  public readonly initCollection?: DatasetItem[];

  @Description("Logging configuration")
  @ValidateNested()
  @Type(() => LoggingConfig)
  @IsOptional()
  public readonly logging: LoggingConfig = new LoggingConfig();

  @Description("Runtime configuration")
  @ValidateNested()
  @Type(() => RuntimeConfig)
  @IsDefined()
  public readonly runtime!: RuntimeConfig;

  @Description("Authorization header used in provider proxy")
  @IsOptional()
  @IsString()
  public readonly authorizationHeader: string = "Authorization";
}
