import {
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { VerifiablePresentation, toArray } from "@tsg-dsp/common-dsp";
import { DSPError } from "../utils/errors/error.js";
import { Request } from "express";

export const VP = createParamDecorator(
  (_, context: ExecutionContext): VerifiablePresentation | undefined => {
    try {
      const request: Request = context.switchToHttp().getRequest();
      if (!request.user) {
        Logger.warn("No VP found in request", "VP-Decorator");
        return undefined;
      }
      if (request.user[0]! instanceof VerifiablePresentation) {
        Logger.warn("No VP found in request user", "VP-Decorator");
        Logger.debug(request.user, "VP-Decorator");
        return undefined;
      }
      return request.user[0];
    } catch (err) {
      Logger.error("Error in retrieving VP", err, "VP-Decorator");
      throw new DSPError(
        `Error in retrieving VP`,
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(new Logger("VP Decorator"));
    }
  }
);

export const VPId = createParamDecorator(
  (_, context: ExecutionContext): string | undefined => {
    try {
      const request: Request = context.switchToHttp().getRequest();

      if (!request.user) {
        Logger.warn("No VP found in request", "VPId-Decorator");
        return undefined;
      }
      if (request.user[0]! instanceof VerifiablePresentation) {
        Logger.warn("No VP found in request user", "VPId-Decorator");
        Logger.debug(request.user, "VPId-Decorator");
        return undefined;
      }
      return toArray(
        toArray(request.user[0]?.verifiableCredential)[0]?.credentialSubject
      )[0]?.id;
    } catch (err) {
      Logger.error("Error in retrieving VP ID", err, "VPId-Decorator");
      throw new DSPError(
        `Error in retrieving VP ID`,
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(new Logger("VP ID Decorator"));
    }
  }
);
