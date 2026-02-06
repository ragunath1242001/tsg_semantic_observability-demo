import { Inject } from "@nestjs/common";

import { OwnableEntity } from "../../model/ownable.entity.js";

export const OWNERSHIP_CHECKER_TOKEN_PREFIX = "OWNERSHIP_CHECKER_";

export function getOwnershipCheckerToken<T extends OwnableEntity>(
  entity: new (...args: any[]) => T
): string {
  return `${OWNERSHIP_CHECKER_TOKEN_PREFIX}${entity.name}`;
}

export function InjectOwnershipChecker<T extends OwnableEntity>(
  entity: new (...args: any[]) => T
): ParameterDecorator {
  return Inject(getOwnershipCheckerToken(entity));
}
