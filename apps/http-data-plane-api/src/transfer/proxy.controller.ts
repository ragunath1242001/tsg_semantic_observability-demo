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
import { Request, Response } from "express";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import { TransferService } from "./transfer.service.js";

@ApiTags("Proxy")
@Controller()
@DisableOAuthGuard()
export class ProxyController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @All("/proxy/:id{/*path}")
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
    await this.transferService.handleProxyRequest(
      id,
      authorization,
      path || "",
      request,
      response
    );
  }
}
