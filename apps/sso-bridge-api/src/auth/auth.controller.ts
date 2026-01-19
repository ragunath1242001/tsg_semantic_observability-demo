import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Redirect,
  Req
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { nonEmptyStringPipe } from "@tsg-dsp/common-api";
import { Request } from "express";

import { RootConfig } from "../config.js";
import { OauthUser } from "../model/user.dao.js";
import { oauthUserToDto } from "../utils/user.js";
import { User } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: RootConfig
  ) {}

  @Get("user")
  @ApiOperation({
    summary: "Get user",
    description: "Get the current user and their roles and grants."
  })
  @HttpCode(HttpStatus.OK)
  async getUser(@User() user?: OauthUser) {
    if (user) {
      return {
        state: "authenticated",
        user: oauthUserToDto(user)
      };
    } else {
      return {
        state: "unauthenticated"
      };
    }
  }

  @Post("login")
  @ApiOperation({
    summary: "Login",
    description: "Login with username and password."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        username: {
          example: "admin",
          type: "string"
        },
        password: {
          example: "hunter2",
          type: "string"
        }
      },
      required: ["username", "password"]
    }
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: {
          example: "b86483f3-3792-4a54-b11e-f1c6face9935",
          type: "string"
        },
        username: {
          example: "admin",
          type: "string"
        },
        email: {
          example: "admin@example.com",
          type: "string"
        },
        roles: {
          type: "array",
          items: {
            type: "string"
          }
        },
        grants: {
          type: "array",
          items: {
            type: "string"
          }
        }
      }
    }
  })
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
  @ApiOperation({
    summary: "Logout",
    description: "Logout the current user."
  })
  @Redirect("/", HttpStatus.FOUND)
  async logout(@Req() request: Request) {
    await this.authService.logout(request);
    return {
      url: this.config.server.publicAddress
    };
  }

  @Post("2fa/verify")
  @ApiOperation({
    summary: "Verify 2FA Token",
    description: "Verify two-factor authentication token for login"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        token: {
          example: "123456",
          type: "string"
        }
      },
      required: ["token"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async verify2FA(
    @Body("token", nonEmptyStringPipe) token: string,
    @Req() request: Request
  ) {
    return await this.authService.verify2FA(token, request);
  }
}
