import { Injectable, Logger, Optional } from "@nestjs/common";
import axios, {
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig
} from "axios";
import { randomBytes } from "crypto";
import fs from "fs";
import { decodeJwt, importJWK, SignJWT } from "jose";
import querystring from "querystring";

import { AuthConfig } from "../config/auth.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";

/** Client assertion type for private_key_jwt as per RFC 7523 */
const JWT_BEARER_ASSERTION_TYPE =
  "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

interface Token {
  jwt: string;
  expiration?: number;
}

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
  private privateKey: object | null = null;

  axiosInstance(
    config: CreateAxiosDefaults | undefined = undefined
  ): AxiosInstance {
    const interceptor = async (value: InternalAxiosRequestConfig<any>) => {
      const token = await this.getToken();
      if (token) {
        value.headers.Authorization = `Bearer ${token}`;
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

  private async getPrivateKey(): Promise<object | null> {
    if (this.privateKey) {
      return this.privateKey;
    }
    if (this.authConfig.privateKeyJwk) {
      this.privateKey = this.authConfig.privateKeyJwk;
      return this.privateKey;
    }

    if (this.authConfig.privateKeyJwkFile) {
      try {
        if (fs.existsSync(this.authConfig.privateKeyJwkFile)) {
          const privateKeyData = fs.readFileSync(
            this.authConfig.privateKeyJwkFile,
            "utf8"
          );
          this.privateKey = JSON.parse(privateKeyData);
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
        alg: (privateKeyJwk as any).alg || "RS256",
        typ: "JWT",
        kid: (privateKeyJwk as any).kid
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
}
