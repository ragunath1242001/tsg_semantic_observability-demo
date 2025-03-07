import { Injectable, Logger, Optional } from "@nestjs/common";
import axios, {
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig
} from "axios";
import { decodeJwt } from "jose";
import querystring from "querystring";

import { AuthConfig } from "../config/auth.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";

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

      const params = querystring.stringify({
        grant_type: "client_credentials",
        client_id: this.authConfig.clientId,
        client_secret: this.authConfig.clientSecret
      });
      try {
        const response = await axios.post(metadata.token_endpoint, params);
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

  private valid(token?: Token) {
    if (token?.expiration) {
      const timeInSeconds = new Date().getTime() / 1000;
      return timeInSeconds < token.expiration - 10;
    } else {
      return false;
    }
  }
}
