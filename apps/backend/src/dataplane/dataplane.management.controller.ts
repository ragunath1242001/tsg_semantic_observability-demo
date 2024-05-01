import {
  Controller,
  Logger,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  All,
  RawBodyRequest,
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";
import { Roles } from "../auth/roles.guard";
import { Request, Response } from "express";

@Controller("/management")
@Roles("controlplane_dataplane")
export class DataPlaneManagementController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/state")
  async getState(): Promise<DataPlaneStateDto> {
    return await this.dataPlaneService.getState();
  }

  @Get("/transfers")
  async getTransfers(): Promise<TransferDto[]> {
    return await this.dataPlaneService.getTransfers();
  }

  @All("/transfers/:id/execute/:version/:path(*)?")
  @HttpCode(HttpStatus.ACCEPTED)
  async executeTransfer(
    @Param("id") id: string,
    @Param("version") version: string,
    @Param("path") path: string | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ): Promise<any> {
    this.logger.log(`Requesting transfer execution for id ${id}`);
    return await this.dataPlaneService.executeProxyRequest(
      id,
      version,
      path || "",
      request,
      response,
    );
  }
}
