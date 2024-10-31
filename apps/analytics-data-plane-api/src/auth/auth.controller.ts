import { Controller, Get, Next, Req, Res, UseGuards } from "@nestjs/common";
import { DisableOAuthGuard, OAuthLoginGuard } from "./oauth.guard";
import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { Client, ClientInfo } from "./roles.guard";
import { AuthConfig } from "../config";

@Controller("auth")
export class AuthController {
  constructor(private readonly authConfig: AuthConfig) {}
  @Get("user")
  @DisableOAuthGuard()
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
  login(@Res() res: Response) {
    if (!this.authConfig.enabled) {
      res.redirect("/");
    }
  }

  @Get("logout")
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
