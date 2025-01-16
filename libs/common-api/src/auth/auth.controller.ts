import { Controller, Get, Next, Req, Res, UseGuards } from "@nestjs/common";
import { DisableOAuthGuard, OAuthLoginGuard } from "./oauth.guard.js";
import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { Client } from "./roles.guard.js";
import {
  ApiExtraModels,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { AuthConfig } from "../config/auth.js";
import {
  AuthenticatedUser,
  UnauthenticatedUser,
  ClientInfo
} from "./client.info.js";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(private readonly authConfig: AuthConfig) {}
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
  login(@Res() res: Response) {
    if (!this.authConfig.enabled) {
      res.redirect("/");
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
  logout(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    const redirectURL = this.authConfig.redirectURL;
    if (!this.authConfig.enabled) {
      res.redirect("/");
      return;
    }
    return req.logout(function (err: any) {
      if (err) {
        return next(err);
      }
      res.redirect(redirectURL);
    });
  }

  @Get("callback")
  @DisableOAuthGuard()
  @UseGuards(OAuthLoginGuard)
  @ApiFoundResponse()
  @ApiOperation({
    summary: "Login callback",
    description:
      "Users are redirected from the authorization server to this endpoint which will redirect them to the frontend (`auth.redirectURL`)"
  })
  @ApiFoundResponse()
  callback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): any {
    passport.authenticate("oauth", {
      successRedirect: this.authConfig.redirectURL,
      failureRedirect: this.authConfig.redirectURL
    })(req, res, next);
  }
}
