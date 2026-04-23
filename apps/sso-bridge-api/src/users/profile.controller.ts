import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { validationPipe } from "@tsg-dsp/common-api";
import { ChangePasswordDto, UserDto } from "@tsg-dsp/sso-bridge-dtos";
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
  @ApiResponse({
    status: 200,
    description: "Current user profile returned.",
    type: UserDto
  })
  async getProfile(@Req() request: Request) {
    return await this.usersService.getUserProfile(request);
  }

  @Patch("password")
  @ApiOperation({ summary: "Change current user password" })
  @ApiBody({
    type: ChangePasswordDto,
    description: "Current and new password"
  })
  @ApiResponse({ status: 200, description: "Password successfully updated." })
  async changePassword(
    @Body(validationPipe) changePasswordDto: ChangePasswordDto,
    @Req() request: Request
  ) {
    return await this.usersService.changePassword(
      request,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }
}
