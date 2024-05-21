import { Controller, Get, Next, Req, Res, UseGuards } from "@nestjs/common";
import { DisableOAuthGuard, OAuthLoginGuard } from "./oauth.guard.js";
import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { Client } from "./roles.guard.js";
import { AuthConfig } from "../config.js";
import { ClientInfo } from "@libs/dtos";
import {
  ApiExtraModels,
  ApiFoundResponse,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  AuthenticatedUserDto,
  UnauthenticatedUserDto,
} from "./auth.schemas.js";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  constructor(private readonly authConfig: AuthConfig) {}
  @Get("user")
  @DisableOAuthGuard()
  @ApiExtraModels(AuthenticatedUserDto, UnauthenticatedUserDto)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AuthenticatedUserDto) },
        { $ref: getSchemaPath(UnauthenticatedUserDto) },
      ],
    },
  })
  getUser(@Client() client: ClientInfo | undefined) {
    if (client) {
      return {
        state: "authenticated",
        user: client,
      };
    } else {
      return {
        state: "unauthenticated",
      };
    }
  }

  @Get("login")
  @ApiFoundResponse()
  login(@Res() res: Response) {
    if (!this.authConfig.enabled) {
      res.redirect("/");
    }
  }

  @Get("logout")
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
  callback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): any {
    passport.authenticate("oauth", {
      successRedirect: this.authConfig.redirectURL,
      failureRedirect: this.authConfig.redirectURL,
    })(req, res, next);
  }
}
