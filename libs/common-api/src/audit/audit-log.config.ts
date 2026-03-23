import { AuditLogConfig, AuditSeverity, Resource } from "@tsg-dsp/common-dtos";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

import { Description } from "../utils/configToMarkdown.js";

export class OtlpAuditHandlerConfig {
  @Description("OTLP HTTP logs endpoint URL")
  @IsString()
  url: string = "http://localhost:4318/v1/logs";

  @Description("Additional HTTP headers to include in OTLP requests")
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @Description("OTLP export timeout in milliseconds")
  @IsInt()
  @Min(1)
  timeoutMillis: number = 5000;

  @Description("Maximum number of concurrent OTLP export requests")
  @IsInt()
  @Min(1)
  concurrencyLimit: number = 1;

  @Description("Service name included on OTLP log attributes")
  @IsString()
  serviceName: string = "tsg-dsp-api";

  @Description("Optional service version included on OTLP log attributes")
  @IsString()
  @IsOptional()
  serviceVersion?: string;
}

export class AuditHandlersConfig {
  @Description("Enable console audit log handler")
  @IsBoolean()
  console: boolean = false;

  @Description("Enable database audit log handler")
  @IsBoolean()
  database: boolean = true;

  @Description("Enable OTLP audit log handler")
  @IsBoolean()
  otlp: boolean = false;
}

export class AuditModuleConfig implements AuditLogConfig {
  @Description("Enable audit logging")
  @IsBoolean()
  enabled: boolean = true;

  @Description("Minimum severity level to log")
  @IsEnum(AuditSeverity)
  minSeverity: AuditSeverity = AuditSeverity.INFO;

  @Description("Always log denied access attempts regardless of action type")
  @IsBoolean()
  logDenied: boolean = true;

  @Description(
    "Log delegated access attempts when enabled, while still respecting action-specific success filters"
  )
  @IsBoolean()
  logDelegated: boolean = true;

  @Description(
    "Log successful mutation actions (create, update, delete, manage)"
  )
  @IsBoolean()
  logMutations: boolean = true;

  @Description("Log successful execute actions")
  @IsBoolean()
  logExecute: boolean = false;

  @Description(
    "Log successful read actions — disabled by default as reads are frequent and rarely relevant for auditing"
  )
  @IsBoolean()
  logReads: boolean = false;

  @Description(
    "Resources that are always logged regardless of action-specific success filters"
  )
  @IsOptional()
  sensitiveResources?: Resource[] = [
    Resource.W_KEY,
    Resource.W_CREDENTIAL,
    Resource.SSO_USER
  ];

  @Description("Handler configuration")
  @ValidateNested()
  @Type(() => AuditHandlersConfig)
  @IsOptional()
  handlers: AuditHandlersConfig = new AuditHandlersConfig();

  @Description("OTLP audit log handler configuration")
  @ValidateNested()
  @Type(() => OtlpAuditHandlerConfig)
  @IsOptional()
  otlp: OtlpAuditHandlerConfig = new OtlpAuditHandlerConfig();
}
