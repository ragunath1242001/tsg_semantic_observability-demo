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
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  PaginationOptionsDto,
  PaginationQuery,
  Requires,
  UsePagination,
  validationPipe
} from "@tsg-dsp/common-api";
import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto
} from "@tsg-dsp/sso-bridge-dtos";
import { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { getOwnershipFieldsFromSession } from "../utils/ownership.js";
import { UsersService } from "./users.service.js";

@ApiTags("Users")
@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Requires(Action.READ, Resource.SSO_USER)
  @UsePagination()
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({
    status: 200,
    description: "List of users returned.",
    type: [UserDto]
  })
  async getUsers(@PaginationQuery() paginationOptions: PaginationOptionsDto) {
    return await this.usersService.getUsers(paginationOptions);
  }

  @Post("create")
  @Requires(Action.CREATE, Resource.SSO_USER)
  @ApiOperation({ summary: "Create a new user" })
  @ApiBody({ type: CreateUserDto, description: "Data for the new user" })
  @ApiResponse({
    status: 201,
    description: "The user has been successfully created.",
    type: UserDto
  })
  async createUser(
    @Body(validationPipe) createUserDto: CreateUserDto,
    @Req() request: Request
  ) {
    const ownershipFields = getOwnershipFieldsFromSession(request);
    return await this.usersService.createUser(createUserDto, ownershipFields);
  }

  @Delete(":id")
  @Requires(Action.DELETE, Resource.SSO_USER)
  @ApiOperation({ summary: "Delete a user" })
  @ApiParam({ name: "id", type: String, description: "User id" })
  @ApiResponse({ status: 200, description: "User successfully deleted." })
  async deleteUser(@Param("id") id: string, @Req() request: Request) {
    return this.usersService.deleteUser(id, request);
  }

  @Patch("update/:id")
  @Requires(Action.UPDATE, Resource.SSO_USER)
  @ApiOperation({ summary: "Update an existing user" })
  @ApiParam({ name: "id", type: String, description: "User id" })
  @ApiBody({ type: UpdateUserDto, description: "Updated user data" })
  @ApiResponse({
    status: 200,
    description: "User successfully updated.",
    type: UserDto
  })
  async updateUser(
    @Param("id") id: string,
    @Body(validationPipe) updateUserDto: UpdateUserDto
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Post(":id/reset-2fa")
  @Requires(Action.EXECUTE, Resource.SSO_USER)
  @ApiOperation({
    summary: "Reset 2FA for a user",
    description:
      "Admin endpoint to reset two-factor authentication for a user. Deletes all TOTP credentials, WebAuthn credentials, and recovery codes."
  })
  @ApiParam({ name: "id", type: String, description: "User id" })
  @ApiResponse({
    status: 200,
    description: "2FA successfully reset for the user."
  })
  async resetUser2FA(@Param("id") id: string) {
    await this.usersService.resetUser2FA(id);
    return {
      success: true,
      message:
        "2FA has been reset for this user. They will need to set it up again on their next login."
    };
  }
}
