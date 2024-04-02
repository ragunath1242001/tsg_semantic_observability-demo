import {
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  createParamDecorator,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { Strategy } from "passport-http-bearer";
import { DSPError } from "../utils/errors/error";
import { JwtPayload, decode } from "jsonwebtoken";
import { plainToInstance } from "class-transformer";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common";
import { toArray } from "../utils/unions";

export const VP = createParamDecorator(
  (
    _,
    context: ExecutionContext
  ):
    | VerifiablePresentation<VerifiableCredential<CredentialSubject>>
    | undefined => {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return undefined;
    const vp = plainToInstance(VerifiablePresentation, request.user);
    return vp;
  }
);

export const VPId = createParamDecorator(
  (_, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return undefined;
    const vp = plainToInstance(VerifiablePresentation, request.user);
    return toArray(toArray(vp.verifiableCredential)[0].credentialSubject)[0].id;
  }
);

@Injectable()
export class VerifiablePresentationStrategy extends PassportStrategy(
  Strategy,
  "vp"
) {
  constructor(private readonly authService: AuthService) {
    super();
  }
  private readonly logger = new Logger(this.constructor.name);

  async validate(token: string) {
    let tokenPayload: JwtPayload | null = null;
    try {
      tokenPayload = decode(token, { json: true });
    } catch (err) {
      throw new DSPError(
        "Malformed token",
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(this.logger, "warn");
    }
    if (!tokenPayload) {
      this.logger.warn(`Token could not be decoded: ${tokenPayload}`);
      throw new DSPError(
        "Token could not be decoded",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    const valid = await this.authService.validateToken(token);
    if (!valid) {
      throw new DSPError(
        "Verifiable Presentation token not valid",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    return valid;
  }
}
