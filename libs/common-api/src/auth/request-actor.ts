import { PermissionString, RequestActor } from "@tsg-dsp/common-dtos";

export interface AuthenticatedActorSource {
  sub?: string;
  clientId?: string;
  azp?: string;
  permissions?: PermissionString[] | string[];
  username?: string;
  preferred_username?: string;
  didId?: string;
  properties?: {
    didId?: string;
  };
}

export function isServiceActor(
  user?: Pick<AuthenticatedActorSource, "clientId" | "azp">
): boolean {
  return Boolean(user?.clientId || user?.azp);
}

export function toRequestActor(user: AuthenticatedActorSource): RequestActor {
  return {
    sub: user.sub || "",
    type: isServiceActor(user) ? "service" : "user",
    serviceName: user.clientId || user.azp,
    permissions: Array.isArray(user.permissions)
      ? (user.permissions as PermissionString[])
      : undefined,
    didId: user.properties?.didId || user.didId,
    username: user.preferred_username || user.username || user.sub
  };
}
