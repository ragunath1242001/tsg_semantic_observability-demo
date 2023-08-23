import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "./auth.services.js";
import { Clients } from "../model/clients.dao.js";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({usernameField: 'clientId', passwordField: 'clientSecret'});
  }

  async validate(clientId: string, clientSecret: string): Promise<Clients> {
    const client = await this.authService.validateUser(clientId, clientSecret);
    if (!client) {
      throw new UnauthorizedException();
    }
    return client;
  }
}