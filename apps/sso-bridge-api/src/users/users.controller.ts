import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  PaginationOptionsDto,
  PaginationQuery,
  UsePagination
} from "@tsg-dsp/common-api";
import { UserWithPasswordDto } from "@tsg-dsp/sso-bridge-dtos";
import { Request } from "express";

import { AuthGuard, ManagementRoles } from "../auth/auth.guard.js";
import { UsersService } from "./users.service.js";

@ApiTags("Users")
@Controller("users")
@UseGuards(AuthGuard)
@ManagementRoles("ssobridge_admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UsePagination()
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({ status: 200, description: "List of users returned." })
  async getUsers(@PaginationQuery() paginationOptions: PaginationOptionsDto) {
    return await this.usersService.getUsers(paginationOptions);
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({
    status: 201,
    description: "The user has been successfully created."
  })
  async createUser(@Body() createUserDto: Partial<UserWithPasswordDto>) {
    return await this.usersService.createUser(createUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a user" })
  @ApiParam({ name: "id", type: Number, description: "User id" })
  @ApiResponse({ status: 200, description: "User successfully deleted." })
  async deleteUser(@Param("id") id: number, @Req() request: Request) {
    return this.usersService.deleteUser(id, request);
  }

  @Patch("update/:id")
  @ApiOperation({ summary: "Update an existing user" })
  @ApiParam({ name: "id", type: Number, description: "User id" })
  @ApiResponse({ status: 200, description: "User successfully updated." })
  async updateUser(
    @Param("id") id: number,
    @Body() updateUserDto: Partial<UserWithPasswordDto>
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Post(":id/reset-2fa")
  @ApiOperation({
    summary: "Reset 2FA for a user",
    description:
      "Admin endpoint to reset two-factor authentication for a user. Deletes all TOTP credentials, WebAuthn credentials, and recovery codes."
  })
  @ApiParam({ name: "id", type: Number, description: "User id" })
  @ApiResponse({
    status: 200,
    description: "2FA successfully reset for the user."
  })
  async resetUser2FA(@Param("id") id: number) {
    await this.usersService.resetUser2FA(id);
    return {
      success: true,
      message:
        "2FA has been reset for this user. They will need to set it up again on their next login."
    };
  }
}
