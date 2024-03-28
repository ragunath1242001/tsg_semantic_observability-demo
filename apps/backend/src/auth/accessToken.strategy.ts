import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ClientsService } from "./client.service.js";
import { jwtSecrets } from "../utils/secrets.js";

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly authService: ClientsService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecrets.access,
    });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async validate(payload: any) {
    return this.authService.getMinimalClient(payload.sub);
  }
}
