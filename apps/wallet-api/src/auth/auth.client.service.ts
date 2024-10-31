import { Injectable } from "@nestjs/common";
import { AuthConfig } from "../config.js";
import axios, {
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig
} from "axios";
import querystring from "querystring";
import { decodeJwt } from "jose";

interface Token {
  jwt: string;
  expiration?: number;
}

@Injectable()
export class AuthClientService {
  constructor(private readonly authConfig: AuthConfig) {}
  private access_token?: Token;
  private refresh_token?: Token;
  private _axiosInstance?: AxiosInstance;

  axiosInstance(config: CreateAxiosDefaults | undefined): AxiosInstance {
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
    if (!this.axiosInstance) {
      this._axiosInstance = axios.create();
      this._axiosInstance.interceptors.request.use(interceptor);
    }
    return this._axiosInstance!;
  }

  private async getToken(): Promise<string | undefined> {
    if (this.authConfig.enabled) {
      if (this.valid(this.access_token)) {
        return this.access_token!.jwt;
      }
      var params: string;
      if (this.valid(this.refresh_token)) {
        params = querystring.stringify({
          grant_type: "refresh_token",
          refresh_token: this.refresh_token!.jwt,
          client_id: this.authConfig.clientId,
          client_secret: this.authConfig.clientSecret
        });
      } else {
        params = querystring.stringify({
          grant_type: "password",
          username: this.authConfig.clientUsername,
          password: this.authConfig.clientPassword,
          client_id: this.authConfig.clientId,
          client_secret: this.authConfig.clientSecret
        });
      }
      const response = await axios.post(this.authConfig.tokenURL, params);
      if (response.data.refresh_token) {
        const payload = decodeJwt(response.data.refresh_token);
        this.refresh_token = {
          jwt: response.data.refresh_token,
          expiration: payload.exp
        };
      }
      if (response.data.access_token) {
        const payload = decodeJwt(response.data.access_token);
        this.access_token = {
          jwt: response.data.access_token,
          expiration: payload.exp
        };
        return response.data.access_token;
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
