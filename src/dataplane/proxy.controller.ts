import { All, Controller, Headers, Logger, Param, Req, Res } from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { Request, Response } from "express";

@Controller()
export class ProxyController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);
  
  @All("/proxy/:id/:version/:path(*)?")
  async getData(@Param('id') id: string, @Param('version') version: string, @Param('path') path: string | undefined, @Headers('Authorization') authorization: string, @Req() request: Request, @Res() response: Response) {
    this.logger.log(`Test: ${version} ${path}`)
    await this.dataPlaneService.handleProxyRequest(id, authorization, version, path || '', request, response);
  }
}