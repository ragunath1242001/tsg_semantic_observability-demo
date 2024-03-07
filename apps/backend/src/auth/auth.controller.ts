import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request as ExpressRequest } from "express";
import { ClientsService } from "./client.service.js";
import { ClientInfo, ClientSignup, ResetPassword } from "@libs/dtos";
import { DisableJwtGuard } from "./jwt.guard.js";
import { Clients } from "../model/clients.dao.js";

@Controller("auth")
@DisableJwtGuard(true)
export class AuthController {
  constructor(private readonly clientsService: ClientsService) {}

  @UseGuards(AuthGuard("local"))
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: ExpressRequest) {
    return this.clientsService.login(req.user as ClientInfo);
  }
  @UseGuards(AuthGuard("jwt-refresh"))
  @Get("refresh")
  async refresh(@Request() req: ExpressRequest) {
    const user = req.user as ClientInfo;
    if (!user.refreshToken) {
      throw new UnauthorizedException();
    }
    return this.clientsService.validateRefreshToken(
      user.sub,
      user.refreshToken
    );
  }

  @Post("signup")
  @HttpCode(HttpStatus.OK)
  async signup(@Body() body: ClientSignup): Promise<Clients> {
    return await this.clientsService.signup(body, false);
  }

  @Post("reset")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPassword): Promise<void> {
    return await this.clientsService.resetPassword(body);
  }

  @Post("forgot")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Query("clientId") clientId: string): Promise<void> {
    return await this.clientsService.forgotPassword(clientId);
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verify(
    @Query("clientId") clientId: string,
    @Query("code") code: string
  ): Promise<void> {
    return await this.clientsService.verify(code, clientId);
  }
}
