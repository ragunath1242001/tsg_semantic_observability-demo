import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { nonEmptyStringPipe } from "@tsg-dsp/common-api";
import { Request } from "express";

import { OauthUser } from "../model/user.dao.js";
import { User } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request) {
    return await this.authService.logout(request);
  }
}
