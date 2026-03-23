import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger
} from "@nestjs/common";
import { AppError, ProtocolAuditService } from "@tsg-dsp/common-api";
import { Request } from "express";

import { inferDspAuditTarget } from "./protocol-audit.util.js";
import { VCAuthService } from "./vc.auth.service.js";

@Injectable()
export class VerifiablePresentationGuard implements CanActivate {
  constructor(
    private readonly vcAuthService: VCAuthService,
    private readonly protocolAuditService: ProtocolAuditService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const target = inferDspAuditTarget(request);
    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith("Bearer ")
    ) {
      const token = request.headers.authorization.substring(7);
      try {
        const valid = await this.vcAuthService.validateVP(token);
        request.user = valid;
        return true;
      } catch (error) {
        await this.protocolAuditService.logDenied({
          caller: this.protocolAuditService.createUnknownServiceActor(
            "remote-control-plane"
          ),
          action: target.action,
          resource: {
            type: target.resource,
            id: target.id
          },
          reason: error instanceof Error ? error.message : "Invalid VP token"
        });
        throw error;
      }
    }
    this.logger.error(
      `Invalid VP authorization header: ${request.headers.authorization}`
    );
    await this.protocolAuditService.logDenied({
      caller: this.protocolAuditService.createUnknownServiceActor(
        "remote-control-plane"
      ),
      action: target.action,
      resource: {
        type: target.resource,
        id: target.id
      },
      reason: "Invalid VP authorization header"
    });
    throw new AppError(
      "Invalid VP authorization header",
      HttpStatus.UNAUTHORIZED
    );
  }
}
