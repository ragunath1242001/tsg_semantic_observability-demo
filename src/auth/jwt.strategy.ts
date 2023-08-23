import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtSecret } from "./auth.module.js";
import { AuthService } from "./auth.services.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async validate(payload: any) {
    return this.authService.validateToken(payload.clientId);
  }
}