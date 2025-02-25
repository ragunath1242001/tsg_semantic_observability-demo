import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { OauthService } from "./oauth.service.js";
import {
  AuthorizationRequest,
  JWKS,
  TokenRequestWrapper,
  nonEmptyStringPipe,
  validateOrRejectSync,
  validationPipe
} from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import {
  ApiOperation,
  ApiOkResponse,
  ApiBadGatewayResponse,
  ApiTags
} from "@nestjs/swagger";
import { AuthGuard, ManagementRoles, User } from "../auth/auth.guard.js";
import { Request, Response } from "express";
import { OauthUser } from "../model/user.dao.js";

@ApiTags("Oauth")
@Controller("oauth")
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get("authorize")
  @ApiOperation({
    summary: "Authorize",
    description: "Authorize a client and redirect to the client's redirect_uri."
  })
  @HttpCode(HttpStatus.OK)
  @Redirect(undefined, HttpStatus.FOUND)
  async authorize(
    @Query(validationPipe) authorizationRequest: AuthorizationRequest
  ) {
    return this.oauthService.authorize(authorizationRequest);
  }

  @Post("login")
  @ApiOperation({
    summary: "Login",
    description: "Login a user and redirect to the client's redirect_uri."
  })
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Query(validationPipe) authorizationRequest: AuthorizationRequest,
    @Query("redirect", new DefaultValuePipe(false), ParseBoolPipe)
    redirect: boolean,
    @Body("username") username?: string,
    @Body("password") password?: string,
    @User() user?: OauthUser
  ) {
    await this.oauthService.loginHandler(
      req,
      res,
      authorizationRequest,
      redirect,
      username,
      password,
      user
    );
  }

  @Post("token")
  @ApiOperation({
    summary: "Token",
    description: "Get a token for the client."
  })
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
  @ApiOperation({
    summary: "Get Userinfo",
    description: "Get the userinfo for the token."
  })
  @HttpCode(HttpStatus.OK)
  async userinfoGet(@Query("token", nonEmptyStringPipe) token: string) {
    return this.oauthService.userinfo(token);
  }

  @Post("userinfo")
  @ApiOperation({
    summary: "Get Userinfo",
    description: "Get the userinfo for the token."
  })
  @HttpCode(HttpStatus.OK)
  async userinfoPost(@Body("token", nonEmptyStringPipe) token: string) {
    return this.oauthService.userinfo(token);
  }

  @Post("introspect")
  @ApiOperation({
    summary: "Introspect",
    description: "Introspect the token."
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ManagementRoles("admin")
  async introspect(
    @Body("token", nonEmptyStringPipe) token: string,
    @Body("token_type_hint") tokenTypeHint?: string
  ) {
    return this.oauthService.introspect(token, tokenTypeHint);
  }

  @Post("device_authorization")
  @ApiOperation({
    summary: "Device Authorization",
    description: "Device Authorization"
  })
  @HttpCode(HttpStatus.OK)
  async deviceAuthorization() {
    return this.oauthService.deviceAuthorization();
  }

  @Post("revocation")
  @ApiOperation({
    summary: "Revocation",
    description: "Revocation of the token."
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ManagementRoles("admin")
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
