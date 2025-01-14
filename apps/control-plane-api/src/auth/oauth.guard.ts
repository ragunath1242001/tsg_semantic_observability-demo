import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { AuthConfig } from "../config.js";

export const DisableOAuthGuard = Reflector.createDecorator<boolean>();

@Injectable()
export class OAuthLoginGuard extends AuthGuard("oauth") implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const result: boolean = (await super.canActivate(context)) as boolean;
    await super.logIn(context.switchToHttp().getRequest());
    return result;
  }
}

@Injectable()
export class OAuthGuard
  extends AuthGuard(["oauth-bearer", "oauth"])
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
    private readonly authConfig: AuthConfig
  ) {
    super();
  }
  canActivate(context: ExecutionContext) {
    if (!this.authConfig.enabled) {
      return true;
    }
    const disabled =
      this.reflector.get(DisableOAuthGuard, context.getHandler()) ||
      this.reflector.get(DisableOAuthGuard, context.getClass());
    if (disabled) {
      return true;
    }
    const request: Request = context.switchToHttp().getRequest();
    const session = request.session as any;
    if (session?.passport?.user) {
      return true;
    }
    return super.canActivate(context);
  }
}
