import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { UsersService } from "./users.service.js";
import { UserDto } from "@tsg-dsp/oauth-server-dtos";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({ status: 200, description: "List of users returned." })
  async getUsers() {
    return await this.usersService.getUsers();
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
  async deleteUser(@Param("id") id: number) {
    return this.usersService.deleteUser(id);
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
