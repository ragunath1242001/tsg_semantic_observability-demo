import {
  Controller,
  Logger,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  All,
  RawBodyRequest,
  Query,
  Body,
  Put,
  ValidationPipe,
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { DatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { Roles } from "../auth/roles.guard";
import { Request, Response } from "express";
import { AgreementDto, CatalogDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { DataPlaneStateDto, TransferDto } from "@tsg-dsp/common-dtos";

@Controller("/management")
@Roles("controlplane_dataplane")
export class DataPlaneManagementController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/state")
  async getState(): Promise<DataPlaneStateDto> {
    return await this.dataPlaneService.getStateDto();
  }

  @Get("/catalog")
  async getCatalog(): Promise<CatalogDto> {
    return await this.dataPlaneService.getControlPlaneCatalog();
  }

  @Post("/refresh")
  async refreshRegistration() {
    return await this.dataPlaneService.registerDataplane();
  }

  @Get("/dataset")
  async getDatasetConfig(): Promise<DatasetConfig> {
    return await this.dataPlaneService.getDatasetConfig();
  }

  @Put("/dataset")
  async updateDatasetConfig(
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: true }))
    datasetConfig: DatasetConfig,
  ) {
    return await this.dataPlaneService.updateDatasetConfig(datasetConfig);
  }

  @Get("/transfers")
  async getTransfers(): Promise<TransferDto[]> {
    return await this.dataPlaneService.getTransfers();
  }

  @Get("/transfers/:id")
  async getTransfer(@Param("id") id: string): Promise<TransferDto> {
    return await this.dataPlaneService.getTransferById(id);
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

  @All("/transfers/:id/execute/:path(*)?")
  @HttpCode(HttpStatus.ACCEPTED)
  async executeTransfer(
    @Param("id") id: string,
    @Param("path") path: string | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ): Promise<any> {
    this.logger.log(`Requesting transfer execution for id ${id}`);
    return await this.dataPlaneService.executeProxyRequest(
      id,
      path || "",
      request,
      response,
    );
  }
}
