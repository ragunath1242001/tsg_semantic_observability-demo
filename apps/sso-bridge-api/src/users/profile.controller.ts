import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { UsersService } from "./users.service.js";

@ApiTags("Profile")
@Controller("profile")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Current user profile returned." })
  async getProfile(@Req() request: Request) {
    return await this.usersService.getUserProfile(request);
  }

  @Patch("password")
  @ApiOperation({ summary: "Change current user password" })
  @ApiResponse({ status: 200, description: "Password successfully updated." })
  async changePassword(
    @Body("currentPassword") currentPassword: string,
    @Body("newPassword") newPassword: string,
    @Req() request: Request
  ) {
    return await this.usersService.changePassword(
      request,
      currentPassword,
      newPassword
    );
  }
}
