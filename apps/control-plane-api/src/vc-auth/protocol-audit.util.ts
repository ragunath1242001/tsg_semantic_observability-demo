import { Action, Resource } from "@tsg-dsp/common-dtos";
import { Request } from "express";

export function inferDspAuditTarget(request: Request): {
  action: Action;
  resource: Resource;
  id?: string;
} {
  if (request.path.startsWith("/catalog/datasets/")) {
    return {
      action: Action.READ,
      resource: Resource.CP_DATASET,
      id: request.params["id"]
    };
  }

  if (request.path.startsWith("/catalog")) {
    return {
      action: Action.READ,
      resource: Resource.CP_CATALOG
    };
  }

  if (request.path.includes("/negotiations/")) {
    if (request.method === "GET") {
      return {
        action: Action.READ,
        resource: Resource.CP_NEGOTIATION,
        id: request.params["id"]
      };
    }

    if (
      request.path === "/negotiations/request" ||
      request.path.endsWith("/request")
    ) {
      return {
        action: Action.CREATE,
        resource: Resource.CP_NEGOTIATION,
        id: request.params["id"]
      };
    }

    return {
      action: Action.EXECUTE,
      resource: Resource.CP_NEGOTIATION,
      id: request.params["id"]
    };
  }

  if (request.path.includes("/transfers/")) {
    if (request.method === "GET") {
      return {
        action: Action.READ,
        resource: Resource.CP_TRANSFER,
        id: request.params["id"]
      };
    }

    if (request.path === "/transfers/request") {
      return {
        action: Action.CREATE,
        resource: Resource.CP_TRANSFER
      };
    }

    return {
      action: Action.EXECUTE,
      resource: Resource.CP_TRANSFER,
      id: request.params["id"]
    };
  }

  return {
    action: Action.READ,
    resource: Resource.CP_CATALOG
  };
}
