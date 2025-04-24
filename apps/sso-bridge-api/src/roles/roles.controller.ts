import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  PaginationOptionsDto,
  PaginationQuery,
  UsePagination
} from "@tsg-dsp/common-api";
import { RoleDto } from "@tsg-dsp/sso-bridge-dtos";

import { AuthGuard, ManagementRoles } from "../auth/auth.guard.js";
import { RolesService } from "./roles.service.js";

@ApiTags("Roles")
@Controller("roles")
@UseGuards(AuthGuard)
@ManagementRoles("ssobridge_admin")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @UsePagination()
  @ApiOperation({ summary: "Get all roles" })
  @ApiResponse({ status: 200, description: "List of roles returned." })
  async getRoles(@PaginationQuery() paginationOptions: PaginationOptionsDto) {
    return await this.rolesService.getRoles(paginationOptions);
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new role" })
  @ApiResponse({
    status: 201,
    description: "The role has been successfully created."
  })
  async createUser(@Body() createRoleDto: Partial<RoleDto>) {
    return await this.rolesService.createRole(createRoleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a role" })
  @ApiParam({ name: "id", type: Number, description: "Role id" })
  @ApiResponse({ status: 200, description: "Role successfully deleted." })
  async deleteRole(@Param("id") id: number) {
    return this.rolesService.deleteRole(id);
  }

  @Patch("update/:id")
  @ApiOperation({ summary: "Update an existing role" })
  @ApiParam({ name: "id", type: Number, description: "Role id" })
  @ApiResponse({ status: 200, description: "Role successfully updated." })
  async updateRole(
    @Param("id") id: number,
    @Body() updateRoleDto: Partial<RoleDto>
  ) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }
}
