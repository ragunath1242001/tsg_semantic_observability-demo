import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  Req
} from "@nestjs/common";
import {
  AppError,
  AuthorizationResponse,
  validationPipe
} from "@tsg-dsp/common-api";
import { Request } from "express";

import { User } from "../auth/auth.guard.js";
import { OauthUser } from "../model/user.dao.js";
import { IngressAuthService } from "./ingress-auth.service.js";

@Controller("ingress-auth")
export class IngressAuthController {
  constructor(private readonly ingressAuthService: IngressAuthService) {}

  @Get("auth-url")
  @HttpCode(HttpStatus.OK)
  async authUrl(@User() user?: OauthUser) {
    if (user) {
      return {
        state: "authenticated",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          permissions: user.permissions,
          grants: user.grants
        }
      };
    } else {
      throw new AppError(
        "Not authenticated",
        HttpStatus.UNAUTHORIZED,
        "You must be authenticated to access this endpoint."
      );
    }
  }

  @Get("auth-signin")
  @Redirect(undefined, HttpStatus.FOUND)
  async authSignin(
    @Query("clientId") clientId: string,
    @Query("rd") rd: string
  ) {
    return await this.ingressAuthService.handleSignin(clientId, rd);
  }

  @Post("auth-logout")
  async authLogout(@Req() req: Request) {
    await this.ingressAuthService.logout(req);
  }

  @Get("callback")
  @Redirect(undefined, HttpStatus.FOUND)
  async authCallback(
    @Query(validationPipe) authorizationResponse: AuthorizationResponse,
    @Req() req: Request
  ) {
    return await this.ingressAuthService.callback(authorizationResponse, req);
  }
}
