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
import { ControlPlaneConfig } from "@tsg-dsp/common-data-plane-api";
import {
  CollectionDatasetConfig,
  DatasetConfig,
  DatasetItem,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class LoggingConfig {
  @Description("Enable debug request logging")
  @IsBoolean()
  @IsOptional()
  public readonly debug: boolean = false;

  @Description("Server logging configuration")
  @IsString()
  @IsIn(["always", "onClientError", "onServerError", "never"])
  @IsOptional()
  public readonly serverLogging:
    | "always"
    | "onClientError"
    | "onServerError"
    | "never" = "onServerError";

  @Description("Client logging configuration")
  @IsString()
  @IsIn(["always", "onClientError", "onServerError", "never"])
  @IsOptional()
  public readonly clientLogging:
    | "always"
    | "onClientError"
    | "onServerError"
    | "never" = "onClientError";
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

export class SemanticObservabilityConfig {
  @Description("Local participant identifier used for semantic observability")
  @IsString()
  @IsOptional()
  public readonly participantId?: string;

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
