import {
  All,
  Controller,
  Headers,
  Logger,
  Param,
  RawBodyRequest,
  Req,
  Res
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { Request, Response } from "express";
import { DisableOAuthGuard } from "../auth/oauth.guard";
import { DisableRolesGuard } from "../auth/roles.guard";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

@ApiTags("Proxy")
@Controller()
@DisableOAuthGuard()
@DisableRolesGuard()
export class ProxyController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @All("/proxy/:id/:path(*)?")
  @ApiOperation({
    summary: "Proxy a request",
    description:
      "This endpoint is used if the HTTP Data Plane needs to serve as a proxy. "
  })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiParam({
    name: "path",
    required: true,
    description: "Path of receiving application"
  })
  async getData(
    @Param("id") id: string,
    @Param("path") path: string | undefined,
    @Headers("Authorization") authorization: string,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response
  ) {
    this.logger.log(`Test: ${id} ${path}`);
    await this.dataPlaneService.handleProxyRequest(
      id,
      authorization,
      path || "",
      request,
      response
    );
  }
}
