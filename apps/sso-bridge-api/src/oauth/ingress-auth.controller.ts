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

import { IngressAuthService } from "./ingress-auth.service.js";

@Controller("ingress-auth")
export class IngressAuthController {
  constructor(private readonly ingressAuthService: IngressAuthService) {}

  @Get("auth-url")
  @HttpCode(HttpStatus.OK)
  async authUrl(@Req() req: Request): Promise<string> {
    const isAuthenticated = await this.ingressAuthService.isAuthenticated(req);
    if (isAuthenticated) {
      return "ok";
    }
    throw new AppError(
      "Not authenticated",
      HttpStatus.UNAUTHORIZED,
      "You must be authenticated to access this endpoint."
    );
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
