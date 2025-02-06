import { Controller, Get } from "@nestjs/common";
import { OauthService } from "./oauth.service.js";

@Controller("oauth")
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get("authorize")
  async authorize() {
    return this.oauthService.authorize();
  }

  @Get("token")
  async token() {
    return this.oauthService.token();
  }

  @Get("userinfo")
  async userinfo() {
    return this.oauthService.userinfo();
  }
  @Get("introspect")
  async introspect() {
    return this.oauthService.introspect();
  }
  @Get("device_authorization")
  async deviceAuthorization() {
    return this.oauthService.deviceAuthorization();
  }
  @Get("revocation")
  async revocation() {
    return this.oauthService.revocation();
  }
  @Get("jwks")
  async getJWKS() {
    return this.oauthService.getJWKS();
  }
}
