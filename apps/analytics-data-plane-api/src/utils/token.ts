import { HttpStatus, Logger } from "@nestjs/common";

import { DataPlaneError } from "./errors/error.js";

export function parseToken(authorizationHeader: string | undefined): string {
  const tokenFromHeader = authorizationHeader?.split(" ")?.[1];

  if (tokenFromHeader === undefined) {
    throw new DataPlaneError("Invalid token", HttpStatus.UNAUTHORIZED).andLog(
      new Logger("TokenParser")
    );
  }

  return tokenFromHeader;
}
