import { Injectable } from "@nestjs/common";
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

  async validate(token: string) {
    try {
      const response = await axios.post(
        this.authConfig.introspectionURL,
        querystring.stringify({
          token: token,
          token_type_hint: "access_token"
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
        return null;
      }
    } catch (err) {
      return null;
    }
  }
}
