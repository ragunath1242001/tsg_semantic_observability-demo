import { Action, AuditSeverity, Resource } from "@tsg-dsp/common-dtos";
import { describe, expect, it, vi } from "vitest";

import { ConsoleAuditLogHandler } from "./audit.log.service.js";
import {
  AuditModuleConfig,
  OtlpAuditHandlerConfig
} from "./audit-log.config.js";
import { createConfiguredAuditHandlers } from "./audit-log.module.js";
import { DatabaseAuditLogHandler } from "./database-audit-log.handler.js";
import { OtlpAuditLogHandler } from "./otlp-audit-log.handler.js";

describe("createConfiguredAuditHandlers", () => {
  it("keeps database handler enabled by default", () => {
    const config = new AuditModuleConfig();
    const consoleHandler = new ConsoleAuditLogHandler();
    const databaseHandler = {} as DatabaseAuditLogHandler;
    const otlpHandler = new OtlpAuditLogHandler(new OtlpAuditHandlerConfig(), {
      emit: vi.fn()
    });

    const handlers = createConfiguredAuditHandlers(config, {
      consoleHandler,
      databaseHandler,
      otlpHandler
    });

    expect(handlers).toEqual([databaseHandler]);
  });

  it("adds OTLP handlers when enabled", () => {
    const config = new AuditModuleConfig();
    config.handlers.otlp = true;

    const consoleHandler = new ConsoleAuditLogHandler();
    const databaseHandler = {} as DatabaseAuditLogHandler;
    const otlpHandler = new OtlpAuditLogHandler(new OtlpAuditHandlerConfig(), {
      emit: vi.fn()
    });

    const handlers = createConfiguredAuditHandlers(config, {
      consoleHandler,
      databaseHandler,
      otlpHandler
    });

    expect(handlers).toEqual([databaseHandler, otlpHandler]);
  });
});

describe("OtlpAuditLogHandler", () => {
  it("serializes the audit entry into the OTLP body and attributes", async () => {
    const emit = vi.fn();
    const handler = new OtlpAuditLogHandler(
      Object.assign(new OtlpAuditHandlerConfig(), {
        serviceName: "control-plane-api",
        serviceVersion: "0.18.0"
      }),
      { emit }
    );

    await handler.write({
      timestamp: new Date("2026-03-20T10:00:00.000Z"),
      severity: AuditSeverity.WARNING,
      correlationId: "corr-123",
      caller: {
        sub: "user-1",
        type: "user",
        username: "alice"
      },
      action: Action.READ,
      resource: {
        type: Resource.CP_AUDIT_LOG,
        id: "audit-1"
      },
      environment: {
        ipAddress: "127.0.0.1",
        requestMethod: "GET",
        requestPath: "/api/audit-log"
      },
      result: {
        allowed: false,
        reason: "forbidden"
      }
    });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: "WARNING",
        body: expect.stringContaining('"correlationId":"corr-123"'),
        attributes: expect.objectContaining({
          "service.name": "control-plane-api",
          "service.version": "0.18.0",
          "audit.action": Action.READ,
          "audit.result.allowed": false,
          "audit.environment.request_path": "/api/audit-log"
        })
      })
    );
  });
});
