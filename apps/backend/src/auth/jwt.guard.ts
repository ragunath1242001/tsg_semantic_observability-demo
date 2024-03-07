import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

export const DisableJwtGuard = Reflector.createDecorator<boolean>();

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const disabled =
      this.reflector.get(DisableJwtGuard, context.getHandler()) ||
      this.reflector.get(DisableJwtGuard, context.getClass());
    if (disabled) {
      return true;
    }
    return super.canActivate(context);
  }
}
