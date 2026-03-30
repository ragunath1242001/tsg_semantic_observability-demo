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
import { DatasetDto } from "@tsg-dsp/common-dsp";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested
} from "class-validator";

export class LLMConfig {
  @Description("Enable LLM integration for AI-powered metadata generation")
  @IsBoolean()
  enabled: boolean = false;

  @Description("API key for the (Open)AI service")
  @IsString()
  @ValidateIf((c) => c.enabled)
  apiKey?: string;

  @Description(
    "Base URL for the (Open)AI service. Example: https://your-endpoint.cognitiveservices.azure.com/openai/v1/"
  )
  @IsString()
  @ValidateIf((c) => c.enabled)
  baseUrl?: string;

  @Description("Model name to use (e.g., 'gpt-4o-mini')")
  @IsString()
  @IsOptional()
  model?: string;
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

  @Description("Persistent volume claim name for file storage")
  @IsString()
  @IsOptional()
  public pvcName?: string;

  @Description("Maximum number of columns to include in inline metadata")
  @IsOptional()
  @IsInt()
  public maxInlineMetadataColumns: number = 200;

  @Description("Recreate file metadata for existing files")
  @IsBoolean()
  @IsOptional()
  @Transform(valueToBoolean)
  public readonly recreateFileMetadata: boolean = false;
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

  @Description(
    "Interval in milliseconds for auto-refreshing the jobs table in the UI (0 to disable)"
  )
  @IsInt()
  @IsOptional()
  public readonly jobRefreshIntervalMs: number = 10000;
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

  @Description("Kubernetes image pull policy (IfNotPresent, Always, Never)")
  @IsString()
  @IsIn(["IfNotPresent", "Always", "Never"])
  @IsOptional()
  public readonly pullPolicy: "IfNotPresent" | "Always" | "Never" =
    "IfNotPresent";

  @Description(
    "Kubernetes image pull secrets for private registries (array of secret names)"
  )
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly pullSecrets?: string[];

  @Description(
    "Kubernetes Node selector for scheduling jobs. See https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector for format details and usage examples."
  )
  @IsOptional()
  @IsObject()
  public readonly nodeSelector?: Record<string, string>;

  @Description(
    "Kubernetes Node affinity for scheduling jobs. See https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/ for format details and usage examples."
  )
  @IsOptional()
  @IsObject()
  public readonly affinity?: object;

  @Description(
    "Kubernetes Tolerations for scheduling jobs on tainted nodes. See https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ for format details and usage examples."
  )
  @IsOptional()
  @IsArray()
  public readonly tolerations?: object[];
}

export class DockerConfig extends OrchestrationConfigBase {
  override readonly type: "docker" = "docker" as const;

  @Description("Docker socket path (e.g., /var/run/docker.sock)")
  @IsString()
  @IsOptional()
  public readonly socketPath: string = "/var/run/docker.sock";

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

export type AnalyticsDataPlaneMode = "standalone" | "client" | "server";

export class SplitConfig {
  @Description(
    "Runtime mode: standalone (current behavior), client (network-constrained runner), or server (open-network exchanger)"
  )
  @IsString()
  @IsOptional()
  public readonly mode: AnalyticsDataPlaneMode = "standalone";

  @Description(
    "Peer WebSocket URL for bridge connection (Socket.IO server base URL)"
  )
  @IsString()
  @IsOptional()
  public readonly bridgePeerWsUrl?: string;

  @Description(
    "Chunk size in bytes for large event data transfers over WebSocket (default: 512KB)"
  )
  @IsOptional()
  public readonly bridgeChunkSize?: number;
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

  @Description("Client/server split configuration")
  @ValidateNested()
  @Type(() => SplitConfig)
  @IsOptional()
  public readonly split: SplitConfig = new SplitConfig();

  @Description("LLM configuration for AI-powered metadata enhancement")
  @ValidateNested()
  @Type(() => LLMConfig)
  @IsOptional()
  public readonly llm: LLMConfig = new LLMConfig();

  @Description("Audit logging configuration")
  @ValidateNested()
  @Type(() => AuditModuleConfig)
  @IsOptional()
  public readonly audit: AuditModuleConfig = new AuditModuleConfig();
}
