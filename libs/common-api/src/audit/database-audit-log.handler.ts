import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditLogEntry } from "@tsg-dsp/common-dtos";
import { Repository } from "typeorm";

import { AuditLogHandler } from "./audit.log.service.js";
import { AuditLogDao } from "./audit-log.dao.js";

@Injectable()
export class DatabaseAuditLogHandler implements AuditLogHandler {
  constructor(
    @InjectRepository(AuditLogDao)
    private readonly repository: Repository<AuditLogDao>
  ) {}

  async write(entry: AuditLogEntry): Promise<void> {
    const dao = this.repository.create({
      timestamp: entry.timestamp,
      severity: entry.severity,
      correlationId: entry.correlationId,
      callerSub: entry.caller.sub,
      callerType: entry.caller.type,
      callerServiceName: entry.caller.serviceName,
      callerUsername: entry.caller.username,
      callerDidId: entry.caller.didId,
      onBehalfOfSub: entry.onBehalfOf?.sub,
      onBehalfOfUsername: entry.onBehalfOf?.username,
      onBehalfOfDidId: entry.onBehalfOf?.didId,
      delegationChain: entry.delegationChain,
      action: entry.action,
      resourceType: entry.resource.type,
      resourceId: entry.resource.id,
      ipAddress: entry.environment.ipAddress,
      userAgent: entry.environment.userAgent,
      requestPath: entry.environment.requestPath,
      requestMethod: entry.environment.requestMethod,
      resultAllowed: entry.result.allowed,
      resultReason: entry.result.reason,
      resultMatchedPermission: entry.result.matchedPermission,
      resultEffectiveScope: entry.result.effectiveScope
    });
    await this.repository.save(dao);
  }
}
