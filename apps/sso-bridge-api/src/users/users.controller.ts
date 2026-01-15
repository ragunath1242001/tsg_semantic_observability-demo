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
import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
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
    const result = await this.usersService.getUsers(paginationOptions);
    const transformedData = result.data.map((user) => ({
      ...user,
      roles: user.roles?.map((role) => role.name) || []
    }));
    return { data: transformedData, total: result.total };
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({
    status: 201,
    description: "The user has been successfully created."
  })
  async createUser(@Body() createUserDto: Partial<UserDto>) {
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
    @Body() updateUserDto: Partial<UserDto>
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }
}
