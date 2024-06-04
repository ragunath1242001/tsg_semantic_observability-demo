import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyFunction } from "passport-oauth2";
import { AuthConfig } from "../config";
import { decodeJwt } from "jose";

@Injectable()
export class OAuthStrategy extends PassportStrategy(Strategy, "oauth") {
  _verify!: VerifyFunction;

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
    Object.defineProperty(this._verify, "length", {
      value: this.validate.length + 1,
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
