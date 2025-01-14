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
  Delete
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service.js";
import { Roles } from "../auth/roles.guard.js";
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
  async getDatasetConfig(): Promise<DatasetDto[]> {
    return await this.dataPlaneService.getDatasets();
  }

  @Put("/dataset")
  async updateDatasetConfig(
    @Body()
    updatedDataset: DatasetDto,
    @Query("datasetId")
    datasetId: string
  ) {
    return await this.dataPlaneService.updateDataset(datasetId, updatedDataset);
  }

  @Post("/dataset")
  async addDataset(@Body() dataset: DatasetDto) {
    return await this.dataPlaneService.addDataset(dataset);
  }

  @Delete("/dataset")
  async deleteDataset(@Query("datasetId") datasetId: string) {
    return await this.dataPlaneService.deleteDataset(datasetId);
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
    @Param("id") id: string
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
    @Query("code") reason: string
  ): Promise<void> {
    return await this.dataPlaneService.transferTerminate(id, code, reason);
  }

  @Post("/transfers/:id/suspend")
  async suspendTransfer(
    @Param("id") id: string,
    @Query("code") reason: string
  ): Promise<void> {
    return await this.dataPlaneService.transferSuspend(id, reason);
  }
}
