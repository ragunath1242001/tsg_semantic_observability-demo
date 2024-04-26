import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { AuthConfig } from "../config.js";
import { decodeJwt } from "jose";

@Injectable()
export class OAuthStrategy extends PassportStrategy(Strategy, "oauth", 5) {
  constructor(authConfig: AuthConfig) {
    if (!authConfig.enabled) {
      throw Error();
    }
    super({
      authorizationURL: authConfig.authorizationURL,
      tokenURL: authConfig.tokenURL,
      clientID: authConfig.clientId,
      clientSecret: authConfig.clientSecret,
      callbackURL: authConfig.callbackURL,
      state: true,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    _params: any
  ) {
    try {
      if (profile["access_token"]) {
        return decodeJwt(profile["access_token"]);
      }
    } catch (err) {
      Logger.log(`Error in validating: ${err}`, "OAuthStrategy");
    }
    return null;
  }
}
