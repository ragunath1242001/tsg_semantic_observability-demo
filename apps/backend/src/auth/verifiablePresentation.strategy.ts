import {
  ExecutionContext,
  HttpStatus,
  Injectable,
  createParamDecorator,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { Strategy } from "passport-http-bearer";
import { DSPError } from "../utils/errors/error";
import jwt from "jsonwebtoken";
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

  async validate(token: string) {
    const tokenPayload = jwt.decode(token, { json: true });
    if (!tokenPayload) {
      throw new DSPError("Malformed token", HttpStatus.UNAUTHORIZED);
    }
    const valid = await this.authService.validateToken(token);
    if (!valid) {
      throw new DSPError(
        "Verifiable Presentation token not valid",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!tokenPayload["vp"]) {
      throw new DSPError(
        'No "vp" field in token payload',
        HttpStatus.UNAUTHORIZED
      );
    }

    return tokenPayload["vp"];
  }
}
