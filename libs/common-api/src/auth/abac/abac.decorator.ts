import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ApiExtension, ApiOAuth2 } from "@nestjs/swagger";
import { Action, permission, Resource } from "@tsg-dsp/common-dtos";

export const ABAC_METADATA_KEY = "abac:requirements";
export const ABAC_ALL_METADATA_KEY = "abac:requirements:all";
export const ABAC_RESOURCE_ID_PARAM_KEY = "abac:resourceIdParam";

export interface AbacRequirement {
  action: Action;
  resource: Resource;
  scope?: string;
}

export function Requires(action: Action, resource: Resource, scope?: string) {
  const perm = permission(action, resource, scope);
  const requirements: AbacRequirement[] = [{ action, resource, scope }];

  return applyDecorators(
    SetMetadata(ABAC_METADATA_KEY, requirements),
    ApiOAuth2([perm])
  );
}

export function RequiresAny(requirements: AbacRequirement[]) {
  const perms = requirements.map((r) =>
    permission(r.action, r.resource, r.scope)
  );

  return applyDecorators(
    SetMetadata(ABAC_METADATA_KEY, requirements),
    ApiOAuth2(perms),
    ApiExtension("x-permission-logic", "any")
  );
}

export function RequiresAll(requirements: AbacRequirement[]) {
  const perms = requirements.map((r) =>
    permission(r.action, r.resource, r.scope)
  );

  return applyDecorators(
    SetMetadata(ABAC_ALL_METADATA_KEY, requirements),
    ApiOAuth2(perms),
    ApiExtension("x-permission-logic", "all")
  );
}

export function ResourceIdParam(paramName: string) {
  return SetMetadata(ABAC_RESOURCE_ID_PARAM_KEY, paramName);
}

export const DisableAbac = SetMetadata("abac:disabled", true);
