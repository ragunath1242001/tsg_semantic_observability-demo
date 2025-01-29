import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-http-bearer";
import axios from "axios";
import querystring from "querystring";
import { decodeJwt } from "jose";
import { AuthConfig } from "../config/auth.js";

@Injectable()
export class OAuthBearerStrategy extends PassportStrategy(
  Strategy,
  "oauth-bearer"
) {
  constructor(private readonly authConfig: AuthConfig) {
    super();
  }
  logger = new Logger(this.constructor.name);

  async validate(token: string) {
    try {
      const response = await axios.post(
        this.authConfig.introspectionURL,
        querystring.stringify({
          token: token
        }),
        {
          auth: {
            username: this.authConfig.clientId,
            password: this.authConfig.clientSecret
          }
        }
      );
      if (response.data.active) {
        return decodeJwt(token);
      } else {
        this.logger.debug(
          `Bearer Access token is not active: ${token} -> ${JSON.stringify(response.data)}`
        );
        return null;
      }
    } catch (err) {
      this.logger.debug(`Error validating bearer token: ${err}`);
      return null;
    }
  }
}
