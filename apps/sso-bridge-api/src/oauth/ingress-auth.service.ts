import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, AuthorizationResponse, getToken } from "@tsg-dsp/common-api";
import crypto from "crypto";
import { createHash } from "crypto";
import { Request } from "express";
import { decodeProtectedHeader, JWK, jwtVerify } from "jose";

import { RootConfig } from "../config.js";
import { getSession } from "../utils/session.js";
import { OauthService } from "./oauth.service.js";

interface Redirect {
  redirect_uri: string;
  client_id: string;
  code_verifier: string;
  validUntil: number;
}

@Injectable()
export class IngressAuthService {
  private static readonly redirects: Map<string, Redirect> = new Map();
  constructor(
    private readonly config: RootConfig,
    private readonly oauthService: OauthService
  ) {}

  async isAuthenticated(req: Request): Promise<boolean> {
    const session = getSession(req);
    return !!(session && session.user);
  }

  async handleSignin(clientId?: string, rd?: string): Promise<{ url: string }> {
    if (!clientId) {
      throw new AppError("No client ID provided", HttpStatus.BAD_REQUEST);
    }

    const state = crypto.randomBytes(16).toString("base64url");
    const codeVerifier = crypto.randomBytes(32).toString("hex");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    IngressAuthService.redirects.set(state, {
      redirect_uri: rd || "/",
      code_verifier: codeVerifier,
      client_id: clientId,
      validUntil: Date.now() + 10 * 60000
    });

    const redirectUri = `${this.config.server.publicAddress}/api/ingress-auth/callback`;

    const authorizationRequest = {
      response_type: "code",
      response_mode: "query",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    };

    const authorizeUrl = `${this.config.server.publicAddress}/api/oauth/authorize?${new URLSearchParams(authorizationRequest).toString()}`;
    return {
      url: authorizeUrl
    };
  }

  async logout(request: Request): Promise<void> {
    const session = getSession(request);
    if (session) {
      session.user = undefined;
    }
  }

  async callback(
    authorizationResponse: AuthorizationResponse,
    request: Request
  ): Promise<{ url: string }> {
    if (!authorizationResponse.state) {
      throw new AppError("No state parameter", HttpStatus.UNAUTHORIZED);
    }

    const redirect = IngressAuthService.redirects.get(
      authorizationResponse.state
    );
    if (!redirect) {
      throw new AppError("Invalid state parameter", HttpStatus.UNAUTHORIZED);
    }
    if (redirect.validUntil < Date.now()) {
      throw new AppError("State parameter expired", HttpStatus.UNAUTHORIZED);
    }

    const token = await getToken({
      code: authorizationResponse.code!,
      code_verifier: redirect.code_verifier,
      tokenEndpoint: `${this.config.server.publicAddress}/api/oauth/token`,
      clientId: redirect.client_id,
      redirectURL: redirect.redirect_uri
    });

    const user = await this.validateTokenViaJwk(token);
    const session = getSession(request);
    if (session) {
      session.user = user;
    }
    IngressAuthService.redirects.delete(authorizationResponse.state!);
    return { url: redirect.redirect_uri };
  }
  private async validateTokenViaJwk(token: string): Promise<any> {
    try {
      const header = decodeProtectedHeader(token);
      const keys = (await this.oauthService.jwks()).keys;
      const key = keys.find((key: JWK) => key.kid === header.kid);
      if (!key) {
        throw new AppError("Invalid token", HttpStatus.UNAUTHORIZED);
      }
      const verificationResult = await jwtVerify(token, key);
      return verificationResult.payload;
    } catch (_) {
      throw new AppError("Invalid token", HttpStatus.UNAUTHORIZED);
    }
  }
}
