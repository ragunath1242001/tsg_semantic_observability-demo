import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { ClientsService } from "./client.service.js";
import { ClientInfo } from "@libs/dtos";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: ClientsService) {
    super({
      usernameField: "client_id",
      passwordField: "client_secret",
    });
  }

  async validate(clientId: string, clientSecret: string): Promise<ClientInfo> {
    const client = await this.authService.signin(clientId, clientSecret);
    if (!client) {
      throw new UnauthorizedException();
    }
    return client;
  }
}
