import { HttpStatus, Injectable } from "@nestjs/common";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { createHash, randomBytes } from "crypto";
import { Request } from "express";
import { decodeProtectedHeader, jwtVerify } from "jose";

import { AuthConfig } from "../config/auth.js";
import { AppError, parseNetworkError } from "../utils/error.js";
import { getSession } from "../utils/session.js";
import {
  AuthorizationRequest,
  AuthorizationResponse,
  CodeTokenRequest
} from "./auth.dto.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";

interface Redirect {
  code_challenge: string;
  validUntil: number;
}

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
    const state = randomBytes(16).toString("hex");
    const codeChallenge = randomBytes(32).toString("hex");
    const authorizationRequest = plainToInstance(AuthorizationRequest, {
      response_type: "code",
      response_mode: "query",
      client_id: this.authConfig.clientId,
      redirect_uri: this.authConfig.callbackURL,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });
    this.redirects.set(state, {
      code_challenge: codeChallenge,
      validUntil: Date.now() + 10 * 60000
    });
    return `${metadata.authorization_endpoint}?${new URLSearchParams({ ...authorizationRequest }).toString()}`;
  }

  async callback(
    authorizationResponse: AuthorizationResponse,
    request: Request
  ): Promise<{ url: string }> {
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
    if (!authorizationResponse.code_verifier) {
      throw new AppError("No PKCE code verifier", HttpStatus.UNAUTHORIZED);
    }
    const expectedCodeVerifier = createHash("sha256")
      .update(redirect.code_challenge)
      .digest("base64url");
    if (authorizationResponse.code_verifier !== expectedCodeVerifier) {
      throw new AppError("Invalid PKCE code verifier", HttpStatus.UNAUTHORIZED);
    }

    if (authorizationResponse.code) {
      return await this.exchangeCodeForToken(
        request,
        authorizationResponse.state,
        authorizationResponse.code,
        authorizationResponse.code_verifier
      );
    }

    throw new AppError(
      "Invalid authorization callback",
      HttpStatus.UNAUTHORIZED
    );
  }

  private async exchangeCodeForToken(
    request: Request,
    state: string,
    code: string,
    code_verifier?: string
  ) {
    const metadata =
      await this.openIDConfigurationService.getOpenIdConfiguration();
    const tokenRequest = plainToInstance(CodeTokenRequest, {
      grant_type: "authorization_code",
      code: code,
      client_id: this.authConfig.clientId,
      redirect_uri: this.authConfig.callbackURL,
      code_verifier: code_verifier
    });
    const response = await axios.post(metadata.token_endpoint, tokenRequest);
    let user: any;
    if (response.data.id_token) {
      user = await this.validateToken(response.data.id_token);
    } else if (response.data.access_token) {
      user = await this.validateToken(response.data.access_token);
    } else {
      throw new AppError(
        "No access token or id token",
        HttpStatus.UNAUTHORIZED
      );
    }
    const session = getSession(request);
    if (session) {
      session.user = user;
    }
    this.redirects.delete(state);
    return {
      url: this.authConfig.redirectURL
    };
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
