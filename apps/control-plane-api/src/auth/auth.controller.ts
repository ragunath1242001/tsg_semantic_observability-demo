import { Controller, Get, Next, Req, Res, UseGuards } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { AuthConfig } from "../config";
import { DisableOAuthGuard, OAuthGuard, OAuthLoginGuard } from "./oauth.guard";
import { Client, ClientInfo } from "./roles.guard";
import {
  ApiExtraModels,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { AuthenticatedUserDto, UnauthenticatedUserDto } from "./auth.schemas";

@Controller("auth")
@UseGuards(OAuthGuard)
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
  @ApiExtraModels(AuthenticatedUserDto, UnauthenticatedUserDto)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AuthenticatedUserDto) },
        { $ref: getSchemaPath(UnauthenticatedUserDto) }
      ]
    }
  })
  getUser(@Client() client: ClientInfo | undefined) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  callback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    passport.authenticate("oauth", {
      successRedirect: this.authConfig.redirectURL,
      failureRedirect: this.authConfig.redirectURL
    })(req, res, next);
  }
}
