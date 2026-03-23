import {
  Action,
  AuditLogEntry,
  AuditSeverity,
  PolicyResult,
  RequestActor,
  Resource
} from "@tsg-dsp/common-dtos";

import { AuditLogHandler, createAuditLogService } from "./audit.log.service.js";

class InMemoryAuditLogHandler implements AuditLogHandler {
  public readonly entries: AuditLogEntry[] = [];

  async write(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

const caller: RequestActor = {
  sub: "service-123",
  type: "service",
  serviceName: "control-plane"
};

const onBehalfOf: RequestActor = {
  sub: "user-123",
  type: "user",
  username: "alice"
};

const allowedResult: PolicyResult = {
  allowed: true
};

describe("AuditLogService", () => {
  it("suppresses delegated successful reads when logReads is disabled", async () => {
    const handler = new InMemoryAuditLogHandler();
    const service = createAuditLogService(
      {
        logReads: false,
        logDelegated: true
      },
      handler
    );

    await service.log({
      caller,
      onBehalfOf,
      action: Action.READ,
      resource: { type: Resource.CP_CATALOG },
      environment: { timestamp: new Date() },
      result: allowedResult,
      severity: AuditSeverity.INFO
    });

    expect(handler.entries).toHaveLength(0);
  });

  it("still logs delegated successful mutations when enabled", async () => {
    const handler = new InMemoryAuditLogHandler();
    const service = createAuditLogService(
      {
        logReads: false,
        logDelegated: true,
        logMutations: true
      },
      handler
    );

    await service.log({
      caller,
      onBehalfOf,
      action: Action.UPDATE,
      resource: { type: Resource.CP_CATALOG, id: "catalog-1" },
      environment: { timestamp: new Date() },
      result: allowedResult,
      severity: AuditSeverity.INFO
    });

    expect(handler.entries).toHaveLength(1);
    expect(handler.entries[0]).toMatchObject({
      caller: {
        sub: "service-123",
        type: "service",
        serviceName: "control-plane"
      },
      onBehalfOf: {
        sub: "user-123",
        username: "alice"
      },
      action: Action.UPDATE,
      resource: {
        type: Resource.CP_CATALOG,
        id: "catalog-1"
      }
    });
  });
});
