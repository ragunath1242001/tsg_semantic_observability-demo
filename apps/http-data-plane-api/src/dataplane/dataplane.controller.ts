import { Controller, Get, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiNotImplementedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { DisableAbac, DisableOAuthGuard, Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { DataPlaneService } from "./dataplane.service.js";

@Controller()
@ApiTags("Data Plane")
@Requires(Action.READ, Resource.HDP_DATAPLANE)
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
  @DisableAbac
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return;
  }
}
