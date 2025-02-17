import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { AuthConfig } from "../config/auth.js";
import { OAuthService } from "./oauth.service.js";
import { getSession } from "../utils/session.js";

export const DisableOAuthGuard = Reflector.createDecorator<boolean>();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

@Injectable()
export class OAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authConfig: AuthConfig,
    private readonly oAuthService: OAuthService
  ) {}
  async canActivate(context: ExecutionContext) {
    if (!this.authConfig.enabled) {
      return true;
    }
    const request: Request = context.switchToHttp().getRequest();
    const response: Response = context.switchToHttp().getResponse();
    const disabled =
      this.reflector.get(DisableOAuthGuard, context.getHandler()) ||
      this.reflector.get(DisableOAuthGuard, context.getClass());
    if (disabled) {
      return true;
    }

    const session = getSession(request);
    if (session?.user) {
      request.user = session.user;
      return true;
    }

    if (request.headers.authorization) {
      if (request.headers.authorization.startsWith("Bearer ")) {
        const token = request.headers.authorization.substring(7);
        const user = await this.oAuthService.validateToken(token);
        request.user = user;
        return true;
      } else {
        throw new HttpException(
          "Invalid authorization header",
          HttpStatus.UNAUTHORIZED
        );
      }
    }

    const redirectUrl =
      await this.oAuthService.generateAuthorizationRequestUrl();
    response.setHeader("Location", redirectUrl);
    throw new HttpException("Redirecting to login", HttpStatus.FOUND);
  }

  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: OAuthGuard
    };
  }
}
