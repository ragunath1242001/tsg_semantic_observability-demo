import {
  All,
  Controller,
  Inject,
  Logger,
  Param,
  RawBodyRequest,
  Req,
  Res
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import { ITransferHandler } from "@tsg-dsp/common-data-plane-api";
import { Request, Response } from "express";

import { HTTPTransferHandler } from "./http-transfer-handler.service.js";

@ApiTags("Proxy")
@Controller()
@DisableOAuthGuard()
export class ProxyController {
  constructor(
    @Inject(ITransferHandler)
    private readonly transferHandler: HTTPTransferHandler
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @All("/proxy/:id/*path")
  @ApiOperation({
    summary: "Proxy a request",
    description:
      "This endpoint is used if the HTTP Data Plane needs to serve as a proxy. "
  })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiParam({
    name: "path",
    required: true,
    description: "Path of receiving application",
    schema: {
      type: "string | string[] | undefined"
    }
  })
  async getData(
    @Param("id") id: string,
    @Param("path") path: string | string[] | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response
  ) {
    const normalizedPath = Array.isArray(path) ? path.join("/") : path || "";

    await this.transferHandler.handleProxyRequest(
      id,
      normalizedPath,
      request,
      response
    );
  }
}
