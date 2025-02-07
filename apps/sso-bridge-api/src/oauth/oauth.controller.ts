import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect
} from "@nestjs/common";
import { OauthService } from "./oauth.service.js";
import {
  AuthorizationRequest,
  JWKS,
  TokenRequestWrapper
} from "@tsg-dsp/sso-bridge-dtos";
import {
  nonEmptyStringPipe,
  validateOrRejectSync,
  validationPipe
} from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import {
  ApiOperation,
  ApiOkResponse,
  ApiBadGatewayResponse
} from "@nestjs/swagger";

@Controller("oauth")
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get("authorize")
  @HttpCode(HttpStatus.OK)
  async authorize(
    @Query(validationPipe) authorizationRequest: AuthorizationRequest
  ) {
    return this.oauthService.authorize(authorizationRequest);
  }

  @Post("login")
  @Redirect(undefined, HttpStatus.FOUND)
  async login(
    @Body(validationPipe) authorizationRequest: AuthorizationRequest,
    @Body("username", nonEmptyStringPipe) username: string,
    @Body("password", nonEmptyStringPipe) password: string
  ) {
    return this.oauthService.login(username, password, authorizationRequest);
  }

  @Post("token")
  @HttpCode(HttpStatus.OK)
  async token(@Body() request: any) {
    const wrapper = validateOrRejectSync(
      plainToInstance(TokenRequestWrapper, {
        request: request
      })
    );
    return await this.oauthService.token(wrapper.request);
  }

  @Get("userinfo")
  @HttpCode(HttpStatus.OK)
  async userinfoGet(@Query("token", nonEmptyStringPipe) token: string) {
    return this.oauthService.userinfo(token);
  }

  @Post("userinfo")
  @HttpCode(HttpStatus.OK)
  async userinfoPost(@Body("token", nonEmptyStringPipe) token: string) {
    return this.oauthService.userinfo(token);
  }

  @Post("introspect")
  @HttpCode(HttpStatus.OK)
  async introspect(
    @Body("token", nonEmptyStringPipe) token: string,
    @Body("token_type_hint") tokenTypeHint?: string
  ) {
    return this.oauthService.introspect(token, tokenTypeHint);
  }

  @Post("device_authorization")
  @HttpCode(HttpStatus.OK)
  async deviceAuthorization() {
    return this.oauthService.deviceAuthorization();
  }

  @Post("revocation")
  @HttpCode(HttpStatus.OK)
  async revocation(
    @Body("token", nonEmptyStringPipe) token: string,
    @Body("token_type_hint") tokenTypeHint?: string
  ) {
    return this.oauthService.revocation(token, tokenTypeHint);
  }

  @Get("jwks")
  @ApiOperation({
    summary: "Get JWKS",
    description: "Get the JWKS for the OAuth server"
  })
  @ApiOkResponse({ type: JWKS })
  @ApiBadGatewayResponse()
  @HttpCode(HttpStatus.OK)
  async getJWKS() {
    return this.oauthService.jwks();
  }
}
