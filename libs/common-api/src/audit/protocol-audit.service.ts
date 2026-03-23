import { Injectable } from "@nestjs/common";
import {
  Action,
  AuditSeverity,
  PolicyResult,
  RequestActor,
  Resource
} from "@tsg-dsp/common-dtos";
import { Request } from "express";

import { DELEGATION_HEADERS } from "../auth/abac/delegation.constants.js";
import { RequestContext } from "../utils/logging.js";
import { AuditLogService } from "./audit.log.service.js";

@Injectable()
export class ProtocolAuditService {
  constructor(private readonly auditLogService: AuditLogService) {}

  createPeerServiceActor(didId: string, serviceName?: string): RequestActor {
    return {
      sub: didId,
      type: "service",
      serviceName,
      didId
    };
  }

  createUnknownServiceActor(serviceName?: string): RequestActor {
    return {
      sub: "unknown",
      type: "service",
      serviceName
    };
  }

  async log(params: {
    caller: RequestActor;
    action: Action;
    resource: {
      type: Resource;
      id?: string;
    };
    result: PolicyResult;
    severity?: AuditSeverity;
    request?: Request;
  }): Promise<void> {
    const request = params.request ?? RequestContext.currentContext?.req;

    await this.auditLogService.log({
      caller: params.caller,
      action: params.action,
      resource: params.resource,
      environment: {
        timestamp: new Date(),
        ipAddress: request?.ip,
        userAgent: request?.headers["user-agent"],
        requestPath: request?.path,
        requestMethod: request?.method,
        correlationId: this.getCorrelationId(request)
      },
      correlationId: this.getCorrelationId(request),
      result: params.result,
      severity: params.severity
    });
  }

  async logAllowed(params: {
    caller: RequestActor;
    action: Action;
    resource: {
      type: Resource;
      id?: string;
    };
    severity?: AuditSeverity;
    request?: Request;
    reason?: string;
  }): Promise<void> {
    await this.log({
      ...params,
      result: {
        allowed: true,
        reason: params.reason
      }
    });
  }

  async logDenied(params: {
    caller: RequestActor;
    action: Action;
    resource: {
      type: Resource;
      id?: string;
    };
    reason: string;
    severity?: AuditSeverity;
    request?: Request;
  }): Promise<void> {
    await this.log({
      ...params,
      severity: params.severity ?? AuditSeverity.WARNING,
      result: {
        allowed: false,
        reason: params.reason
      }
    });
  }

  private getCorrelationId(request?: Request): string | undefined {
    return request?.headers[DELEGATION_HEADERS.CORRELATION_ID.toLowerCase()] as
      | string
      | undefined;
  }
}
