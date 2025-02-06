import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, ServerConfig } from "@tsg-dsp/common-api";

@Injectable()
export class OauthService {
  constructor(private readonly serverConfig: ServerConfig) {}

  async authorize() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async token() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async userinfo() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async introspect() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async deviceAuthorization() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async revocation() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async getJWKS() {
    throw new AppError("Not implemented", HttpStatus.NOT_IMPLEMENTED);
  }

  async getOpenIDConfiguration() {
    // todo interface
    return {
      issuer: this.serverConfig.publicAddress,
      authorization_endpoint: `${this.serverConfig.publicAddress}/api/oauth/authorize`,
      token_endpoint: `${this.serverConfig.publicAddress}/api/oauth/token`,
      userinfo_endpoint: `${this.serverConfig.publicAddress}/api/oauth/userinfo`,
      introspection_endpoint: `${this.serverConfig.publicAddress}/api/oauth/introspect`,
      device_authorization_endpoint: `${this.serverConfig.publicAddress}/api/oauth/device_authorization`,
      revocation_endpoint: `${this.serverConfig.publicAddress}/api/oauth/revoke`,
      jwks_uri: `${this.serverConfig.publicAddress}/api/oauth/jwks`
    };
  }
}
