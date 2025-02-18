import { Controller, Logger, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service.js";

import {
  ApiBadGatewayResponse,
  ApiNotImplementedResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import {
  Roles,
  DisableOAuthGuard,
  DisableRolesGuard
} from "@tsg-dsp/common-api";

@Controller()
@ApiTags("Data Plane")
@ApiOAuth2(["controlplane_dataplane"])
@Roles("controlplane_dataplane")
export class DataPlaneController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/catalog")
  @ApiOperation({
    summary: "Get catalog",
    description: "Get catalog, currently not implemented."
  })
  @ApiNotImplementedResponse()
  @ApiForbiddenResponseDefault()
  @Roles("wallet_manage_clients")
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async getCatalog() {
    return;
  }

  @Get([
    "/health",
    ...(process.env["EMBEDDED_FRONTEND"] ? ["/api/health"] : [])
  ])
  @ApiOperation({
    summary: "Health check",
    description:
      "Retrieves the current health of the control plane. If the control plane is running it always returns an empty 200 OK"
  })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  @DisableOAuthGuard()
  @DisableRolesGuard()
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return;
  }
}
