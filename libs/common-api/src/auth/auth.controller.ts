import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Redirect,
  Req
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { Request } from "express";

import { AuthConfig } from "../config/auth.js";
import { getSession } from "../utils/session.js";
import { validationPipe } from "../utils/validation.pipe.js";
import { AuthorizationResponse } from "./auth.dto.js";
import { Client } from "./client.decorator.js";
import {
  AuthenticatedUser,
  ClientInfo,
  UnauthenticatedUser
} from "./client.info.js";
import { DisableOAuthGuard } from "./oauth.guard.js";
import { OAuthService } from "./oauth.service.js";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(
    private readonly authConfig: AuthConfig,
    private readonly oAuthService: OAuthService
  ) {}
  @Get("user")
  @DisableOAuthGuard()
  @ApiOperation({
    summary: "Retrieve current user status",
    description:
      "Retrieves current user state, whether someone is logged in or not a 200 result is provided. This is used in the frontend to determine whether certain aspects should be shown."
  })
  @ApiExtraModels(AuthenticatedUser, UnauthenticatedUser)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AuthenticatedUser) },
        { $ref: getSchemaPath(UnauthenticatedUser) }
      ]
    }
  })
  getUser(
    @Client() client: ClientInfo | undefined
  ): AuthenticatedUser | UnauthenticatedUser {
    if (client) {
      return {
        state: "authenticated",
        user: client
      };
    } else {
      return {
        state: "unauthenticated"
      };
    }
  }

  @Get("login")
  @ApiFoundResponse()
  @ApiOperation({
    summary: "Login redirect",
    description: "Redirects user to the correct authorization server"
  })
  @Redirect(undefined, HttpStatus.FOUND)
  login() {
    if (!this.authConfig.enabled) {
      return {
        url: "/"
      };
    }
  }

  @Get("logout")
  @ApiFoundResponse()
  @ApiOperation({
    summary: "Logout redirect",
    description:
      "Removes session information and redirects user the root of the frontend (`auth.redirectURL`)"
  })
  @ApiFoundResponse()
  @Redirect(undefined, HttpStatus.FOUND)
  logout(@Req() req: Request) {
    const redirectURL = this.authConfig.redirectURL ?? "/";
    if (this.authConfig.enabled) {
      const session = getSession(req);
      if (session) {
        session.user = undefined;
      }
    }
    return {
      url: redirectURL
    };
  }

  @Get("callback")
  @DisableOAuthGuard()
  @ApiFoundResponse()
  @ApiOperation({
    summary: "Login callback",
    description:
      "Users are redirected from the authorization server to this endpoint which will redirect them to the frontend (`auth.redirectURL`)"
  })
  @Redirect(undefined, HttpStatus.FOUND)
  async callback(
    @Req() req: Request,
    @Query(validationPipe) authorizationResponse: AuthorizationResponse
  ) {
    return await this.oAuthService.callback(authorizationResponse, req);
  }
}
