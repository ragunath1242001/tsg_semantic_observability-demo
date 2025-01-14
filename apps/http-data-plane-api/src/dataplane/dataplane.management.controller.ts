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
  Headers,
  RawBodyRequest,
  Query,
  Body,
  Put,
  ValidationPipe,
  UnprocessableEntityException
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service.js";
import { DatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { Roles } from "../auth/roles.guard.js";
import { Request, Response } from "express";
import {
  AgreementDto,
  CatalogDto,
  CatalogSchema,
  DatasetDto
} from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  DataPlaneStateDto,
  TransferDto
} from "@tsg-dsp/common-dtos";
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
import { DataPlaneClientError } from "../utils/errors/error.js";
import { MetadataDto } from "./dataplane.schemas.js";

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
  @ApiOkResponse({ type: DatasetConfig })
  @ApiForbiddenResponseDefault()
  async getDatasetConfig(): Promise<DatasetConfig> {
    return await this.dataPlaneService.getDatasetConfig();
  }

  @Put("/dataset")
  @ApiOperation({
    summary: "Update dataset",
    description: "Update the current dataset configuration."
  })
  @ApiBody({ type: DatasetConfig })
  @ApiOkResponse({ type: DataPlaneStateDto })
  @ApiForbiddenResponseDefault()
  async updateDatasetConfig(
    @Body(new ValidationPipe({ transform: true, forbidUnknownValues: true }))
    datasetConfig: DatasetConfig
  ) {
    if (
      !datasetConfig.versions.some(
        (v) => v.version === datasetConfig.currentVersion
      )
    ) {
      throw new UnprocessableEntityException(
        "Can't find given current version in given list of dataset versions"
      );
    }
    return await this.dataPlaneService.updateDatasetConfig(datasetConfig);
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

  @Post("/transfers/:id/complete")
  @ApiOperation({ summary: "Complete a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Param("id") id: string): Promise<void> {
    return await this.dataPlaneService.transferComplete(id);
  }

  @Post("/transfers/:id/terminate")
  @ApiOperation({ summary: "Terminate a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiQuery({ name: "reason", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(
    @Param("id") id: string,
    @Query("code") code: string,
    @Query("reason") reason: string
  ): Promise<void> {
    return await this.dataPlaneService.transferTerminate(id, code, reason);
  }

  @Post("/transfers/:id/suspend")
  @ApiOperation({ summary: "Suspend a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiQuery({ name: "code", type: String })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(
    @Param("id") id: string,
    @Query("code") reason: string
  ): Promise<void> {
    return await this.dataPlaneService.transferSuspend(id, reason);
  }

  @All("/transfers/:id/execute/:path(*)?")
  @HttpCode(HttpStatus.ACCEPTED)
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
  @ApiForbiddenResponseDefault()
  async executeTransfer(
    @Param("id") id: string,
    @Param("path") path: string,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ): Promise<any> {
    this.logger.log(`Requesting transfer execution for id ${id}`);
    return await this.dataPlaneService.executeProxyRequest(
      id,
      path,
      request,
      response
    );
  }

  @All("/execute/:path(*)?")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Proxy a request without transfer ID",
    description:
      "This endpoint is used if the HTTP Data Plane needs to serve as a proxy and the transfer hasn't been created yet. Used for automatic handling of the DSP."
  })
  @ApiParam({
    name: "path",
    required: true,
    description: "Path of receiving application"
  })
  @ApiForbiddenResponseDefault()
  async executeTransferWithoutId(
    @Param("path") path: string,
    @Headers("x-dataset-id") datasetId: string,
    @Headers("x-audience") audience: string,
    @Headers("x-controlplane-address") controlPlaneAddress: string,
    @Req()
    request: RawBodyRequest<Request>,
    @Res() response: Response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    this.logger.log(`Requesting transfer execution without transfer id`);
    if (!datasetId || datasetId === "") {
      throw new DataPlaneClientError(
        "No dataset ID provided",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    if (!audience || audience === "") {
      throw new DataPlaneClientError(
        "No audience provided",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    const transferId = await this.dataPlaneService.determineTransferId(
      datasetId,
      audience,
      controlPlaneAddress
    );
    return await this.dataPlaneService.executeProxyRequest(
      transferId,
      path,
      request,
      response
    );
  }
}
