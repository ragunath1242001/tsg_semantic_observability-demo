import { Request } from "express";

import { OauthUser } from "../model/user.dao.js";
import { getUser } from "./session.js";

/**
 * Ownership fields that can be set on entities.
 */
export interface OwnershipFields {
  ownerId?: string;
  ownerIdentifier?: string;
  createdBy?: string;
  tenantId?: string;
}

/**
 * Helper function to get ownership fields from the session user.
 * Returns empty object if no user is in the session.
 */
export function getOwnershipFieldsFromSession(
  request: Request
): OwnershipFields {
  const user = getUser(request);
  if (!user) return {};
  return getOwnershipFieldsFromUser(user);
}

/**
 * Helper function to get ownership fields from an OauthUser.
 * Returns empty object if user is undefined.
 */
export function getOwnershipFieldsFromUser(user?: OauthUser): OwnershipFields {
  if (!user) return {};
  return {
    ownerId: `user:${user.id}`,
    ownerIdentifier: user.email,
    createdBy: `user:${user.id}`
  };
}
