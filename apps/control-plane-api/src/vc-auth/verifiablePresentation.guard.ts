import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger
} from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { Request } from "express";

import { VCAuthService } from "./vc.auth.service.js";

@Injectable()
export class VerifiablePresentationGuard implements CanActivate {
  constructor(private readonly vcAuthService: VCAuthService) {}
  private readonly logger = new Logger(this.constructor.name);
  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith("Bearer ")
    ) {
      const token = request.headers.authorization.substring(7);
      const valid = await this.vcAuthService.validateVP(token);
      request.user = valid;
      return true;
    }
    this.logger.error(
      `Invalid VP authorization header: ${request.headers.authorization}`
    );
    throw new AppError(
      "Invalid VP authorization header",
      HttpStatus.UNAUTHORIZED
    );
  }
}
