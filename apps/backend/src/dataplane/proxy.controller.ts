import {
  All,
  Controller,
  Headers,
  Logger,
  Param,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { Request, Response } from "express";
import { DisableOAuthGuard } from "../auth/oauth.guard";
import { DisableRolesGuard } from "../auth/roles.guard";

@Controller()
@DisableOAuthGuard()
@DisableRolesGuard()
export class ProxyController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @All("/proxy/:id/:path(*)?")
  async getData(
    @Param("id") id: string,
    @Param("path") path: string | undefined,
    @Headers("Authorization") authorization: string,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response,
  ) {
    this.logger.log(`Test: ${id} ${path}`);
    await this.dataPlaneService.handleProxyRequest(
      id,
      authorization,
      path || "",
      request,
      response,
    );
  }
}
