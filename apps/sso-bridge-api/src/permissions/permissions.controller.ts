import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Requires } from "@tsg-dsp/common-api";
import { Action, Resource } from "@tsg-dsp/common-dtos";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsService } from "./permissions.service.js";

@ApiTags("Permissions")
@Controller("permissions")
@UseGuards(AuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Requires(Action.READ, Resource.SSO_CONFIG)
  @ApiOperation({ summary: "Get all available permissions" })
  @ApiResponse({ status: 200, description: "List of permissions returned." })
  async getPermissions() {
    return this.permissionsService.getAvailablePermissions();
  }
}
