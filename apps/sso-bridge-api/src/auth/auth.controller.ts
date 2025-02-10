import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { User } from "./auth.guard.js";
import { OauthUser } from "../model/user.dao.js";
import { nonEmptyStringPipe } from "@tsg-dsp/common-api";
import { Request } from "express";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("user")
  async getUser(@User() user?: OauthUser) {
    if (user) {
      return {
        state: "authenticated",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          grants: user.grants
        }
      };
    } else {
      return {
        state: "unauthenticated"
      };
    }
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body("username", nonEmptyStringPipe) username: string,
    @Body("password", nonEmptyStringPipe) password: string,
    @Req() request: Request
  ) {
    return await this.authService.login(username, password, request);
  }

  @Get("logout")
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request) {
    return await this.authService.logout(request);
  }
}
