import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import {
  LoggerProvider,
  SimpleLogRecordProcessor
} from "@opentelemetry/sdk-logs";
import { AuditLogEntry, AuditSeverity } from "@tsg-dsp/common-dtos";

import { AuditLogHandler } from "./audit.log.service.js";
import { OtlpAuditHandlerConfig } from "./audit-log.config.js";
import {
  flattenAuditLogEntry,
  serializeAuditLogEntry
} from "./audit-log.format.js";

interface AuditLogEmitter {
  emit(record: {
    severityNumber: SeverityNumber;
    severityText: string;
    body: string;
    attributes: Record<string, string | boolean>;
  }): void;
  shutdown?(): Promise<void>;
}

@Injectable()
export class OtlpAuditLogHandler implements AuditLogHandler, OnModuleDestroy {
  private readonly emitter: AuditLogEmitter;

  constructor(
    private readonly config: OtlpAuditHandlerConfig,
    emitter?: AuditLogEmitter
  ) {
    this.emitter = emitter ?? this.createEmitter(config);
  }

  async write(entry: AuditLogEntry): Promise<void> {
    this.emitter.emit({
      severityNumber: this.mapSeverity(entry.severity),
      severityText: entry.severity.toUpperCase(),
      body: JSON.stringify(serializeAuditLogEntry(entry)),
      attributes: {
        ...flattenAuditLogEntry(entry),
        "service.name": this.config.serviceName,
        ...(this.config.serviceVersion
          ? { "service.version": this.config.serviceVersion }
          : {})
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.emitter.shutdown?.();
  }

  private createEmitter(config: OtlpAuditHandlerConfig): AuditLogEmitter {
    const exporter = new OTLPLogExporter({
      url: config.url,
      headers: config.headers,
      timeoutMillis: config.timeoutMillis,
      concurrencyLimit: config.concurrencyLimit
    });
    const provider = new LoggerProvider({
      processors: [new SimpleLogRecordProcessor(exporter)]
    });
    const logger = provider.getLogger(
      config.serviceName,
      config.serviceVersion
    );

    return {
      emit: (record) => logger.emit(record),
      shutdown: () => provider.shutdown()
    };
  }

  private mapSeverity(severity: AuditSeverity): SeverityNumber {
    switch (severity) {
      case AuditSeverity.DEBUG:
        return SeverityNumber.DEBUG;
      case AuditSeverity.INFO:
        return SeverityNumber.INFO;
      case AuditSeverity.WARNING:
        return SeverityNumber.WARN;
      case AuditSeverity.ERROR:
        return SeverityNumber.ERROR;
      case AuditSeverity.CRITICAL:
        return SeverityNumber.FATAL;
    }
  }
}
