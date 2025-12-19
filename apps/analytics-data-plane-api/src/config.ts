import {
  AuthConfig,
  DatabaseConfig,
  Description,
  PostgresConfig,
  ServerConfig,
  SQLiteConfig,
  valueToBoolean
} from "@tsg-dsp/common-api";
import { ControlPlaneConfig } from "@tsg-dsp/common-data-plane-api";
import { DatasetDto } from "@tsg-dsp/common-dsp";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

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

  @Description("Persistent volume claim name for file storage")
  @IsString()
  @IsOptional()
  public pvcName?: string;
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
  @Description(
    "Whether a project agreement is required when creating an algorithm instance"
  )
  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
  public readonly requireProjectAgreement: boolean = false;
}

export type OrchestrationType = "kubernetes" | "docker";

export abstract class OrchestrationConfigBase {
  @Description("Orchestration type: 'kubernetes' or 'docker'")
  @IsString()
  @IsIn(["kubernetes", "docker"])
  public readonly type!: OrchestrationType;
}

export class KubernetesConfig extends OrchestrationConfigBase {
  override readonly type: "kubernetes" = "kubernetes" as const;

  @Description("Kubernetes namespace")
  @IsString()
  @IsOptional()
  public readonly namespace: string = "default";
}

export class DockerConfig extends OrchestrationConfigBase {
  override readonly type: "docker" = "docker" as const;

  @Description("Docker socket path (e.g., /var/run/docker.sock)")
  @IsString()
  @IsOptional()
  public readonly socketPath?: string;

  @Description("Docker network to use for containers")
  @IsString()
  @IsOptional()
  public readonly network?: string;

  @Description(
    "Whether to mount files into Docker containers or provide files via HTTP"
  )
  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
  public readonly mountFiles: boolean = false;

  @Description("Platform to use for Docker containers (e.g., 'linux/amd64')")
  @IsString()
  @IsOptional()
  public readonly platform?: string;
}

export type OrchestrationConfig = KubernetesConfig | DockerConfig;

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

  @Description("Orchestration configuration")
  @ValidateNested()
  @Type(() => OrchestrationConfigBase, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: KubernetesConfig, name: "kubernetes" },
        { value: DockerConfig, name: "docker" }
      ]
    }
  })
  public readonly orchestration: OrchestrationConfig = new KubernetesConfig();
}
