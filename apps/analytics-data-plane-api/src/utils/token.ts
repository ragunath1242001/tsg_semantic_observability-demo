import { HttpStatus, Logger } from "@nestjs/common";
import { DataPlaneError } from "@tsg-dsp/common-data-plane-api";

export function parseToken(authorizationHeader: string | undefined): string {
  const tokenFromHeader = authorizationHeader?.split(" ")?.[1];

  if (tokenFromHeader === undefined) {
    throw new DataPlaneError("Invalid token", HttpStatus.UNAUTHORIZED).andLog(
      new Logger("TokenParser")
    );
  }

  return tokenFromHeader;
}
