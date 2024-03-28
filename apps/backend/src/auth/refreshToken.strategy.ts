import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtSecrets } from "../utils/secrets.js";
import { ClientsService } from "./client.service.js";
import { Request } from "express";

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor(private readonly authService: ClientsService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecrets.refresh,
      passReqToCallback: true,
    });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async validate(req: Request, payload: any) {
    const refreshToken = req.get("Authorization")?.replace("Bearer", "").trim();
    return { ...payload, refreshToken };
  }
}
