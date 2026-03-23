import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  AuditLogHandler,
  AuditLogService,
  ConsoleAuditLogHandler
} from "./audit.log.service.js";
import { AuditModuleConfig } from "./audit-log.config.js";
import { AuditLogDao } from "./audit-log.dao.js";
import { AuditLogQueryService } from "./audit-log-query.service.js";
import { CompositeAuditLogHandler } from "./composite-audit-log.handler.js";
import { DatabaseAuditLogHandler } from "./database-audit-log.handler.js";
import { OtlpAuditLogHandler } from "./otlp-audit-log.handler.js";
import { ProtocolAuditService } from "./protocol-audit.service.js";

export function createConfiguredAuditHandlers(
  config: AuditModuleConfig,
  availableHandlers: {
    consoleHandler: ConsoleAuditLogHandler;
    databaseHandler: DatabaseAuditLogHandler;
    otlpHandler: OtlpAuditLogHandler;
  }
): AuditLogHandler[] {
  return [
    ...(config.handlers.console ? [availableHandlers.consoleHandler] : []),
    ...(config.handlers.database ? [availableHandlers.databaseHandler] : []),
    ...(config.handlers.otlp ? [availableHandlers.otlpHandler] : [])
  ];
}

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogDao])],
  providers: [
    ConsoleAuditLogHandler,
    DatabaseAuditLogHandler,
    {
      provide: OtlpAuditLogHandler,
      useFactory: (config: AuditModuleConfig) =>
        new OtlpAuditLogHandler(config.otlp),
      inject: [AuditModuleConfig]
    },
    AuditLogQueryService,
    ProtocolAuditService,
    {
      provide: CompositeAuditLogHandler,
      useFactory: (
        config: AuditModuleConfig,
        consoleHandler: ConsoleAuditLogHandler,
        dbHandler: DatabaseAuditLogHandler,
        otlpHandler: OtlpAuditLogHandler
      ) => {
        const handlers = createConfiguredAuditHandlers(config, {
          consoleHandler,
          databaseHandler: dbHandler,
          otlpHandler
        });
        const composite = new CompositeAuditLogHandler();
        composite.setHandlers(handlers);
        return composite;
      },
      inject: [
        AuditModuleConfig,
        ConsoleAuditLogHandler,
        DatabaseAuditLogHandler,
        OtlpAuditLogHandler
      ]
    },
    {
      provide: AuditLogService,
      useFactory: (
        config: AuditModuleConfig,
        compositeHandler: CompositeAuditLogHandler
      ) => new AuditLogService(compositeHandler, config),
      inject: [AuditModuleConfig, CompositeAuditLogHandler]
    }
  ],
  exports: [AuditLogService, AuditLogQueryService, ProtocolAuditService]
})
export class AuditLogModule {}
