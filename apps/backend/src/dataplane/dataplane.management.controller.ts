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
  Query,
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";
import { Roles } from "../auth/roles.guard";
import { Request, Response } from "express";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common";

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

  @Get("/transfers/:id/metadata")
  async getMetadata(
    @Param("id") id: string,
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    return await this.dataPlaneService.getMetadata(id);
  }

  @Post("/transfers/:id/start")
  async startTransfer(@Param("id") id: string): Promise<void> {
    return await this.dataPlaneService.transferStart(id);
  }

  @Post("/transfers/:id/complete")
  async completeTransfer(@Param("id") id: string): Promise<void> {
    return await this.dataPlaneService.transferComplete(id);
  }

  @Post("/transfers/:id/terminate")
  async terminateTransfer(
    @Param("id") id: string,
    @Query("code") code: string,
    @Query("code") reason: string,
  ): Promise<void> {
    return await this.dataPlaneService.transferTerminate(id, code, reason);
  }

  @Post("/transfers/:id/suspend")
  async suspendTransfer(
    @Param("id") id: string,
    @Query("code") reason: string,
  ): Promise<void> {
    return await this.dataPlaneService.transferSuspend(id, reason);
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
