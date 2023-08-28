import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { AppRole, ClientInfo } from "../model/clients.dto.js";

export const Roles = Reflector.createDecorator<AppRole | AppRole[]>();

export const Client = createParamDecorator((_, context: ExecutionContext): ClientInfo | undefined => {
const request = context.switchToHttp().getRequest();
  const user = request.user as ClientInfo;
  if (!user) return undefined;
  return (user as ClientInfo)
});

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler()) || this.reflector.get(Roles, context.getClass());
    
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as ClientInfo;
    return [roles].flat().some((r: AppRole) => user.roles.includes(r));
  }
}