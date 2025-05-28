import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import {
  AgreementDto,
  CatalogDto,
  CatalogSchema,
  DatasetDto
} from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  DataPlaneStateDto,
  MetadataDto,
  TransferDto
} from "@tsg-dsp/common-dtos";

import { DataPlaneService } from "./dataplane.service.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("/management")
@Roles("controlplane_dataplane")
export class DataPlaneManagementController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/state")
  @ApiOperation({
    summary: "Get Data Plane state",
    description:
      "Get the state of the data plane, consisting of the id, details and the dataset."
  })
  @ApiOkResponse({ type: DataPlaneStateDto })
  @ApiForbiddenResponseDefault()
  async getState(): Promise<DataPlaneStateDto> {
    return await this.dataPlaneService.getStateDto();
  }

  @Get("/catalog")
  @ApiOperation({
    summary: "Get catalog",
    description: "Get the current catalog from the Control Plane."
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  async getCatalog(): Promise<CatalogDto> {
    return await this.dataPlaneService.getControlPlaneCatalog();
  }

  @Post("/refresh")
  @ApiOperation({
    summary: "(Re)register data plane",
    description:
      "Use this endpoint to (re)register your data plane. Currently it will register with defaults from the config."
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async refreshRegistration() {
    return await this.dataPlaneService.registerDataplane();
  }

  @Get("/dataset")
  @ApiOperation({
    summary: "Get dataset",
    description: "Get the current dataset configuration."
  })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async getDatasetConfig(): Promise<DatasetDto[]> {
    return await this.dataPlaneService.getDatasets();
  }

  @Put("/dataset")
  @ApiOperation({
    summary: "Update dataset",
    description: "Update an existing dataset by id."
  })
  @ApiBody({})
  @ApiQuery({ name: "datasetId", required: true, description: "Dataset ID" })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async updateDatasetConfig(
    @Body()
    updatedDataset: DatasetDto,
    @Query("datasetId", nonEmptyStringPipe)
    datasetId: string
  ) {
    return await this.dataPlaneService.updateDataset(datasetId, updatedDataset);
  }

  @Post("/dataset")
  @ApiOperation({
    summary: "Add dataset",
    description: "Add a new dataset."
  })
  @ApiBody({})
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async addDataset(@Body() dataset: DatasetDto) {
    return await this.dataPlaneService.addDataset(dataset);
  }

  @Delete("/dataset")
  @ApiOperation({
    summary: "Delete dataset",
    description: "Delete an existing dataset by id."
  })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async deleteDataset(
    @Query("datasetId", nonEmptyStringPipe) datasetId: string
  ) {
    return await this.dataPlaneService.deleteDataset(datasetId);
  }

  @Get("/transfers")
  @ApiOperation({ summary: "Get all transfers" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransferDto] })
  @ApiForbiddenResponseDefault()
  async getTransfers(): Promise<TransferDto[]> {
    return await this.dataPlaneService.getTransfers();
  }

  @Get("/transfers/:id")
  @ApiOperation({ summary: "Get transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.OK, type: TransferDto })
  @ApiForbiddenResponseDefault()
  async getTransfer(@Param("id") id: string): Promise<TransferDto> {
    return await this.dataPlaneService.getTransferById(id);
  }

  @Get("/transfers/:id/metadata")
  @ApiOperation({ summary: "Get metadata of transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MetadataDto
  })
  @ApiForbiddenResponseDefault()
  async getMetadata(
    @Param("id") id: string
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    return await this.dataPlaneService.getMetadata(id);
  }

  @Post("/transfers/:id/start")
  @ApiOperation({ summary: "Start a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Param("id") id: string): Promise<void> {
    return await this.dataPlaneService.transferStart(id);
  }

  @Post("/transfers/:id/completion")
  @ApiOperation({ summary: "Complete a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Param("id") id: string): Promise<void> {
    return await this.dataPlaneService.transferComplete(id);
  }

  @Post("/transfers/:id/termination")
  @ApiOperation({ summary: "Terminate a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiQuery({ name: "reason", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(
    @Param("id") id: string,
    @Query("code", nonEmptyStringPipe) code: string,
    @Query("code", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    return await this.dataPlaneService.transferTerminate(id, code, reason);
  }

  @Post("/transfers/:id/suspension")
  @ApiOperation({ summary: "Suspend a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(
    @Param("id") id: string,
    @Query("code", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    return await this.dataPlaneService.transferSuspend(id, reason);
  }
}
