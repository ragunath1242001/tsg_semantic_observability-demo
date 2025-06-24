import { HttpStatus, Injectable } from "@nestjs/common";
import axios from "axios";
import { Request } from "express";
import { decodeProtectedHeader, jwtVerify } from "jose";

import { AuthConfig } from "../config/auth.js";
import { AppError, parseNetworkError } from "../utils/error.js";
import { constructAuthorizationRequestUrl, getToken } from "../utils/oauth.js";
import { getSession } from "../utils/session.js";
import { AuthorizationResponse, Redirect } from "./auth.dto.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";

@Injectable()
export class OAuthService {
  constructor(
    private readonly authConfig: AuthConfig,
    private readonly openIDConfigurationService: OpenIDConfigurationService
  ) {}
  private readonly redirects: Map<string, Redirect> = new Map();

  async generateAuthorizationRequestUrl(): Promise<string> {
    const metadata =
      await this.openIDConfigurationService.getOpenIdConfiguration();
    const { state, code_verifier, url } =
      await constructAuthorizationRequestUrl({
        clientId: this.authConfig.clientId,
        redirectUri: this.authConfig.callbackURL,
        authorizationEndpoint: metadata.authorization_endpoint
      });
    this.redirects.set(state, {
      code_verifier: code_verifier,
      validUntil: Date.now() + 10 * 60000
    });
    return url;
  }

  async callback(
    authorizationResponse: AuthorizationResponse,
    request: Request
  ): Promise<{ url: string }> {
    const metadata =
      await this.openIDConfigurationService.getOpenIdConfiguration();
    if (!authorizationResponse.state) {
      throw new AppError("No state parameter", HttpStatus.UNAUTHORIZED);
    }
    const redirect = this.redirects.get(authorizationResponse.state);
    if (!redirect) {
      throw new AppError("Invalid state parameter", HttpStatus.UNAUTHORIZED);
    }
    if (redirect.validUntil < Date.now()) {
      throw new AppError("State parameter expired", HttpStatus.UNAUTHORIZED);
    }
    const token = await getToken({
      code: authorizationResponse.code!,
      code_verifier: redirect.code_verifier,
      tokenEndpoint: metadata.token_endpoint,
      clientId: this.authConfig.clientId,
      redirectURL: this.authConfig.redirectURL
    });

    const user = await this.validateToken(token);
    const session = getSession(request);
    if (session) {
      session.user = user;
    }
    this.redirects.delete(authorizationResponse.state!);
    return { url: this.authConfig.redirectURL };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return await this.validateTokenViaJwk(token);
    } catch (_) {
      return await this.validateTokenViaIntrospection(token);
    }
  }

  private async validateTokenViaJwk(token: string): Promise<any> {
    try {
      const header = decodeProtectedHeader(token);
      const key = await this.openIDConfigurationService.getKey(header.kid);
      const verificationResult = await jwtVerify(token, key);
      return verificationResult.payload;
    } catch (_) {
      throw new AppError("Invalid token", HttpStatus.UNAUTHORIZED);
    }
  }

  private async validateTokenViaIntrospection(token: string): Promise<any> {
    try {
      const metadata =
        await this.openIDConfigurationService.getOpenIdConfiguration();
      if (!metadata.introspection_endpoint) {
        throw new AppError(
          "No introspection endpoint in OpenID configuration",
          HttpStatus.BAD_REQUEST
        );
      }
      const response = await axios.post(
        metadata.introspection_endpoint,
        {
          token: token,
          token_type_hint: "access_token"
        },
        {
          auth: {
            username: this.authConfig.clientId,
            password: this.authConfig.clientSecret
          }
        }
      );
      const { active, ...user } = response.data;
      if (active) {
        return user;
      } else {
        throw new AppError("Access token not active", HttpStatus.UNAUTHORIZED);
      }
    } catch (error) {
      throw parseNetworkError(
        error,
        "introspecting token",
        HttpStatus.UNAUTHORIZED
      );
    }
  }
}
