import { HttpStatus, Injectable } from "@nestjs/common";
import { AuthConfig } from "../config/auth.js";
import axios from "axios";
import { JWK } from "jose";
import { AppError, parseNetworkError } from "../utils/error.js";
import { OpenIDConfiguration, JWKS } from "./auth.dto.js";
import { plainToInstance } from "class-transformer";

@Injectable()
export class OpenIDConfigurationService {
  constructor(private readonly authConfig: AuthConfig) {}
  private openIdConfiguration?: OpenIDConfiguration;
  private jwks?: JWKS;

  async getOpenIdConfiguration(): Promise<OpenIDConfiguration> {
    if (this.openIdConfiguration) {
      return this.openIdConfiguration;
    }
    try {
      const response = await axios.get<OpenIDConfiguration>(
        this.authConfig.openIdConfigurationURL
      );
      this.openIdConfiguration = plainToInstance(
        OpenIDConfiguration,
        response.data
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        "getting OpenID configuration metadata",
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async getJwks(noCache: boolean = false): Promise<JWKS> {
    if (!noCache && this.jwks) {
      return this.jwks;
    }
    const metadata = await this.getOpenIdConfiguration();
    const jwksUri = metadata.jwks_uri;

    try {
      const response = await axios.get<JWKS>(jwksUri);
      this.jwks = plainToInstance(JWKS, response.data);
      return this.jwks;
    } catch (error) {
      throw parseNetworkError(error, "getting JWKS", HttpStatus.BAD_GATEWAY);
    }
  }

  async getKey(kid?: string): Promise<JWK> {
    if (!kid) {
      throw new AppError("No key ID present in JWT", HttpStatus.UNAUTHORIZED);
    }
    const jwks = await this.getJwks();
    const key = jwks.keys.find((k) => k.kid === kid);
    if (!key) {
      const jwks = await this.getJwks(true);
      const key = jwks.keys.find((k) => k.kid === kid);
      if (!key) {
        throw new AppError(
          "Could not find matching key",
          HttpStatus.UNAUTHORIZED
        );
      }
      return key;
    }
    return key;
  }
}
