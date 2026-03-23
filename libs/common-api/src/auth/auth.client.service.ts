import { Injectable, Logger, Optional } from "@nestjs/common";
import {
  PermissionString,
  RequestActor,
  RequestContext
} from "@tsg-dsp/common-dtos";
import axios, {
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig
} from "axios";
import { randomBytes } from "crypto";
import { Request } from "express";
import fs from "fs";
import { decodeJwt, importJWK, JWK, SignJWT } from "jose";
import querystring from "querystring";

import { AuthConfig } from "../config/auth.js";
import { RequestContext as HttpRequestContext } from "../utils/logging.js";
import { getSession } from "../utils/session.js";
import { DELEGATION_HEADERS } from "./abac/delegation.constants.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";
import { AuthenticatedActorSource, toRequestActor } from "./request-actor.js";

/** Client assertion type for private_key_jwt as per RFC 7523 */
const JWT_BEARER_ASSERTION_TYPE =
  "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

interface Token {
  jwt: string;
  expiration?: number;
}

type RequestWithAuthContext = Request & {
  requestContext?: RequestContext;
  user?: AuthenticatedActorSource;
};

@Injectable()
export class AuthClientService {
  constructor(
    private readonly authConfig: AuthConfig,
    @Optional()
    private readonly openIDConfigurationService?: OpenIDConfigurationService
  ) {
    if (authConfig.enabled && !openIDConfigurationService) {
      throw new Error(
        `OpenIDConfigurationService is required when auth is enabled`
      );
    }
  }
  private readonly logger = new Logger(AuthClientService.name);
  private access_token?: Token;
  private _axiosInstance?: AxiosInstance;
  private privateKey: JWK | null = null;

  axiosInstance(
    config: CreateAxiosDefaults | undefined = undefined
  ): AxiosInstance {
    const interceptor = async (value: InternalAxiosRequestConfig) => {
      const token = await this.getToken();
      if (token) {
        value.headers.Authorization = `Bearer ${token}`;
      }

      for (const [header, headerValue] of Object.entries(
        this.buildDelegationHeaders()
      )) {
        if (!value.headers[header]) {
          value.headers[header] = headerValue;
        }
      }

      return value;
    };
    if (config) {
      const instance = axios.create(config);
      instance.interceptors.request.use(interceptor);
      return instance;
    }
    if (!this._axiosInstance) {
      this._axiosInstance = axios.create();
      this._axiosInstance.interceptors.request.use(interceptor);
    }
    return this._axiosInstance!;
  }

  async getToken(): Promise<string | undefined> {
    if (this.authConfig.enabled) {
      if (this.valid(this.access_token)) {
        return this.access_token!.jwt;
      }
      const metadata =
        await this.openIDConfigurationService!.getOpenIdConfiguration();

      try {
        let response;

        if (this.authConfig.tokenEndpointAuthMethod === "private_key_jwt") {
          const clientAssertion = await this.createClientAssertion(
            metadata.token_endpoint
          );
          const params = querystring.stringify({
            grant_type: "client_credentials",
            client_id: this.authConfig.clientId,
            client_assertion_type: JWT_BEARER_ASSERTION_TYPE,
            client_assertion: clientAssertion
          });
          response = await axios.post(metadata.token_endpoint, params);
        } else {
          const params = querystring.stringify({
            grant_type: "client_credentials",
            client_id: this.authConfig.clientId,
            client_secret: this.authConfig.clientSecret
          });
          response = await axios.post(metadata.token_endpoint, params);
        }

        if (response.data.access_token) {
          const payload = decodeJwt(response.data.access_token);
          this.access_token = {
            jwt: response.data.access_token,
            expiration: payload.exp
          };
          return response.data.access_token;
        } else {
          this.logger.error(`Error getting access token`);
          return undefined;
        }
      } catch (error) {
        this.logger.error(`Error getting token: ${error}`);
        return undefined;
      }
    }
    return undefined;
  }

  private async getPrivateKey(): Promise<JWK | null> {
    if (this.privateKey) {
      return this.privateKey;
    }
    if (this.authConfig.privateKeyJwk) {
      this.privateKey = this.authConfig.privateKeyJwk as JWK;
      return this.privateKey;
    }

    if (this.authConfig.privateKeyJwkFile) {
      try {
        if (fs.existsSync(this.authConfig.privateKeyJwkFile)) {
          const privateKeyData = fs.readFileSync(
            this.authConfig.privateKeyJwkFile,
            "utf8"
          );
          this.privateKey = JSON.parse(privateKeyData) as JWK;
          return this.privateKey;
        } else {
          this.logger.error(
            `Private key file not found: ${this.authConfig.privateKeyJwkFile}`
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to read private key from ${this.authConfig.privateKeyJwkFile}: ${error}`
        );
      }
    }

    return null;
  }

  private async createClientAssertion(tokenEndpoint: string): Promise<string> {
    const privateKeyJwk = await this.getPrivateKey();
    if (!privateKeyJwk) {
      throw new Error(
        "privateKeyJwk must be configured for private_key_jwt authentication"
      );
    }

    const privateKey = await importJWK(privateKeyJwk);
    const now = Math.floor(Date.now() / 1000);

    const assertion = await new SignJWT({})
      .setProtectedHeader({
        alg: privateKeyJwk.alg || "RS256",
        typ: "JWT",
        kid: privateKeyJwk.kid
      })
      .setIssuer(this.authConfig.clientId)
      .setSubject(this.authConfig.clientId)
      .setAudience(tokenEndpoint)
      .setIssuedAt(now)
      .setExpirationTime(now + 300) // 5 minutes
      .setJti(randomBytes(16).toString("hex"))
      .sign(privateKey);

    return assertion;
  }

  private valid(token?: Token) {
    if (token?.expiration) {
      const timeInSeconds = new Date().getTime() / 1000;
      return timeInSeconds < token.expiration - 10;
    } else {
      return false;
    }
  }

  private buildDelegationHeaders(): Record<string, string> {
    const request = HttpRequestContext.currentContext?.req;
    if (!request) {
      return {};
    }

    const requestContext = (request as RequestWithAuthContext).requestContext;

    if (requestContext?.isOnBehalfOf && requestContext.delegation) {
      return this.serializeDelegationHeaders({
        originalActor: requestContext.delegation.originalActor,
        delegationChain: [
          ...requestContext.delegation.delegationChain,
          requestContext.caller
        ],
        effectivePermissions: requestContext.delegation.effectivePermissions,
        correlationId:
          requestContext.delegation.correlationId || this.getCorrelationId(),
        originTimestamp: requestContext.delegation.originTimestamp
      });
    }

    const actor =
      requestContext?.caller || this.extractActorFromRequest(request);
    if (!actor || actor.type !== "user") {
      return this.forwardIncomingDelegationHeaders(request);
    }

    return this.serializeDelegationHeaders({
      originalActor: actor,
      delegationChain: [],
      effectivePermissions: actor.permissions || [],
      correlationId: this.getCorrelationId(),
      originTimestamp: new Date()
    });
  }

  private extractActorFromRequest(request: Request): RequestActor | undefined {
    const typedRequest = request as RequestWithAuthContext;
    const user = typedRequest.user || getSession(request)?.user;
    if (!user?.sub) {
      return undefined;
    }

    return toRequestActor(user);
  }

  private forwardIncomingDelegationHeaders(
    request: Request
  ): Record<string, string> {
    const forwardedHeaders: Record<string, string> = {};

    for (const headerName of Object.values(DELEGATION_HEADERS)) {
      const headerValue = request.headers[headerName.toLowerCase()];
      if (typeof headerValue === "string") {
        forwardedHeaders[headerName] = headerValue;
      }
    }

    return forwardedHeaders;
  }

  private serializeDelegationHeaders(params: {
    originalActor: RequestActor;
    delegationChain: RequestActor[];
    effectivePermissions: PermissionString[];
    correlationId?: string;
    originTimestamp: Date;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      [DELEGATION_HEADERS.ORIGINAL_ACTOR]: JSON.stringify(
        this.sanitizeActor(params.originalActor)
      ),
      [DELEGATION_HEADERS.DELEGATION_CHAIN]: JSON.stringify(
        params.delegationChain.map((actor) => this.sanitizeActor(actor))
      ),
      [DELEGATION_HEADERS.EFFECTIVE_PERMISSIONS]:
        params.effectivePermissions.join(","),
      [DELEGATION_HEADERS.ORIGIN_TIMESTAMP]:
        params.originTimestamp.toISOString()
    };

    if (params.correlationId) {
      headers[DELEGATION_HEADERS.CORRELATION_ID] = params.correlationId;
    }

    return headers;
  }

  private sanitizeActor(actor: RequestActor): RequestActor {
    return {
      sub: actor.sub,
      type: actor.type,
      serviceName: actor.serviceName,
      username: actor.username,
      didId: actor.didId
    };
  }

  private getCorrelationId(): string | undefined {
    const request = HttpRequestContext.currentContext?.req;
    if (!request) {
      return HttpRequestContext.currentContext?.id;
    }

    const incomingCorrelationId =
      request.headers[DELEGATION_HEADERS.CORRELATION_ID.toLowerCase()];
    if (typeof incomingCorrelationId === "string" && incomingCorrelationId) {
      return incomingCorrelationId;
    }

    return HttpRequestContext.currentContext?.id;
  }
}
