import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, ServerConfig } from "@tsg-dsp/common-api";
import {
  AuthorizationRequest,
  ClientCredentialsTokenRequest,
  CodeTokenRequest,
  OpenIDConfiguration,
  RefreshTokenRequest,
  TokenRequest,
  TokenResponse
} from "@tsg-dsp/sso-bridge-dtos";
import { UsersService } from "../users/users.service.js";
import { OauthUser } from "../model/user.dao.js";
import crypto, { createHash } from "crypto";
import { ClientsService } from "../clients/clients.service.js";
import { decodeJwt, JWK } from "jose";
import { TokenService } from "./token.service.js";

@Injectable()
export class OauthService {
  constructor(
    private readonly serverConfig: ServerConfig,
    private readonly usersService: UsersService,
    private readonly clientsService: ClientsService,
    private readonly tokenService: TokenService
  ) {}
  private readonly codes = new Map<string, OauthUser>();

  async authorize(request: AuthorizationRequest) {
    // TODO: Redirect to /#/authorize?QUERY_PARAMS
    // TODO: What to do if user is already logged in? Redirect with code or show UI to let user decide?
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Login</title>
    </head>
    <body>
      <h1>Login</h1>
      <form method="POST" action="login">
        <input type="hidden" name="response_type" value="${request.response_type}" />
        <input type="hidden" name="client_id" value="${request.client_id}" />
        <input type="hidden" name="redirect_uri" value="${request.redirect_uri}" />
        ${request.response_mode ? `<input type="hidden" name="response_mode" value="${request.response_mode}" />` : ""}
        ${request.scope ? `<input type="hidden" name="scope" value="${request.scope}" />` : ""}
        ${request.state ? `<input type="hidden" name="state" value="${request.state}" />` : ""}
        ${request.nonce ? `<input type="hidden" name="nonce" value="${request.nonce}" />` : ""}
        ${request.code_challenge ? `<input type="hidden" name="code_challenge" value="${request.code_challenge}" />` : ""}
        ${request.code_challenge_method ? `<input type="hidden" name="code_challenge_method" value="${request.code_challenge_method}" />` : ""}
        <div>
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required />
        </div>
        <div>
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required />
        </div>
        <div>
          <button type="submit">Login</button>
        </div>
      </form>
    </body>
    </html>`;
  }

  async login(
    username: string,
    password: string,
    request: AuthorizationRequest
  ) {
    const user = await this.usersService.validateUser(username, password);
    const parameters: Record<string, string> = {};
    if (request.state) {
      parameters.state = request.state;
    }
    if (request.response_type.split(" ").includes("code")) {
      const code = crypto.randomBytes(16).toString("hex");
      this.codes.set(code, user);
      parameters.code = code;
    }
    if (
      request.response_type.split(" ").includes("token") ||
      request.response_type.split(" ").includes("id_token")
    ) {
      const token = await this.tokenService.createToken(
        request.client_id,
        user,
        true,
        user.id,
        request.scope || "",
        request.nonce
      );
      if (request.response_type.split(" ").includes("token")) {
        parameters.access_token = token.access_token;
        parameters.token_type = "Bearer";
        parameters.expires_in = "3600";
      }
      if (request.response_type.split(" ").includes("id_token")) {
        parameters.id_token = token.access_token;
      }
    }
    if (request.code_challenge) {
      if (request.code_challenge_method === "S256") {
        parameters.code_verifier = createHash("sha256")
          .update(request.code_challenge)
          .digest("base64url");
      } else if (request.code_challenge_method === "plain") {
        parameters.code_verifier = request.code_challenge;
      }
    }
    let url: string;
    if (request.response_mode === "fragment") {
      url = `${request.redirect_uri}#${Object.entries(parameters)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&")}`;
    } else {
      url = `${request.redirect_uri}?${Object.entries(parameters)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&")}`;
    }
    return {
      url
    };
  }

  private async codeTokenRequest(
    request: CodeTokenRequest
  ): Promise<TokenResponse> {
    const user = this.codes.get(request.code);
    if (!user) {
      throw new AppError("Invalid code", HttpStatus.BAD_REQUEST);
    }
    const tokenResponse = await this.tokenService.createToken(
      request.client_id,
      user,
      true,
      user.id,
      ""
    );
    this.codes.delete(request.code);
    return tokenResponse;
  }
  private async refreshTokenTokenRequest(
    request: RefreshTokenRequest
  ): Promise<TokenResponse> {
    const token = await this.tokenService.validateToken(
      request.refresh_token,
      "refresh_token"
    );
    if (!token.userId) {
      throw new AppError("Invalid token", HttpStatus.BAD_REQUEST);
    }
    let subject = await this.usersService.getUser(token.userId);
    const tokenResponse = await this.tokenService.createToken(
      token.clientId,
      subject,
      true,
      token.userId,
      token.scope
    );

    await this.tokenService.revokeToken(token.accessToken, "access_token");
    return tokenResponse;
  }
  private async clientCredentialsTokenRequest(
    request: ClientCredentialsTokenRequest
  ): Promise<TokenResponse> {
    const client = await this.clientsService.validateClient(
      request.client_id,
      request.client_secret
    );
    return await this.tokenService.createToken(
      request.client_id,
      client,
      false,
      undefined,
      ""
    );
  }

  async token(request: TokenRequest): Promise<TokenResponse> {
    if (request instanceof CodeTokenRequest) {
      return await this.codeTokenRequest(request);
    } else if (request instanceof RefreshTokenRequest) {
      return await this.refreshTokenTokenRequest(request);
    } else if (request instanceof ClientCredentialsTokenRequest) {
      return await this.clientCredentialsTokenRequest(request);
    }
    throw new AppError("Invalid grant type", HttpStatus.BAD_REQUEST);
  }

  async userinfo(id_token: string) {
    await this.tokenService.validateToken(id_token, "access_token");
    return decodeJwt(id_token);
  }

  async introspect(token: string, token_type_hint: string = "access_token") {
    try {
      await this.tokenService.validateToken(token, token_type_hint);
      return {
        active: true,
        ...decodeJwt(token)
      };
    } catch (e) {
      return {
        active: false
      };
    }
  }

  async deviceAuthorization() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async revocation(token: string, token_type_hint: string = "access_token") {
    await this.tokenService.revokeToken(token, token_type_hint);
  }

  async jwks() {
    return {
      keys: await this.tokenService.keySet()
    };
  }

  openIDConfiguration(): OpenIDConfiguration {
    return {
      issuer: this.serverConfig.publicAddress,
      authorization_endpoint: `${this.serverConfig.publicAddress}/api/oauth/authorize`,
      token_endpoint: `${this.serverConfig.publicAddress}/api/oauth/token`,
      userinfo_endpoint: `${this.serverConfig.publicAddress}/api/oauth/userinfo`,
      introspection_endpoint: `${this.serverConfig.publicAddress}/api/oauth/introspect`,
      device_authorization_endpoint: `${this.serverConfig.publicAddress}/api/oauth/device_authorization`,
      revocation_endpoint: `${this.serverConfig.publicAddress}/api/oauth/revoke`,
      jwks_uri: `${this.serverConfig.publicAddress}/api/oauth/jwks`,
      response_types_supported: [
        "code",
        "token",
        "id_token",
        "code token",
        "code id_token",
        "token id_token",
        "code token id_token"
      ],
      response_modes_supported: ["query", "fragment"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid"],
      grant_types_supported: [
        "authorization_code",
        "refresh_token",
        "client_credentials"
      ],
      subject_types_supported: ["public"],
      claims_supported: [
        "aud",
        "exp",
        "iat",
        "iss",
        "sub",
        "username",
        "email",
        "roles"
      ]
    };
  }
}
