import { Controller, Post, Request, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request as ExpressRequest } from "express";
import { AuthService } from "./auth.services.js";
import { Clients } from "../model/clients.dao.js";
import { plainToClass } from "class-transformer";

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: ExpressRequest) {
    return this.authService.login(plainToClass(Clients, req.user));
  }
}