import {
  All,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res
} from "@nestjs/common";
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import {
  ITransferHandler,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  MetadataDto,
  TransferDto
} from "@tsg-dsp/common-dtos";
import { Request, Response } from "express";

import { DataPlaneClientError } from "../utils/errors/error.js";
import { HTTPTransferHandler } from "./http-transfer-handler.service.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("/management")
@Roles("controlplane_dataplane")
export class TransferManagementController {
  constructor(
    @Inject(ITransferHandler)
    private readonly transferHandler: HTTPTransferHandler,
    private readonly transferClientService: TransferClientService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/transfers")
  @Roles(["controlplane_dataplane", "readonly_user"])
  @ApiOperation({ summary: "Get all transfers" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransferDto] })
  @ApiForbiddenResponseDefault()
  async getTransfers(): Promise<TransferDto[]> {
    return await this.transferHandler.getTransfers();
  }

  @Get("/transfers/:id")
  @Roles(["controlplane_dataplane", "readonly_user"])
  @ApiOperation({ summary: "Get transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.OK, type: TransferDto })
  @ApiForbiddenResponseDefault()
  async getTransfer(@Param("id") id: string): Promise<TransferDto> {
    return await this.transferHandler.getTransferById(id);
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
    return await this.transferHandler.getMetadata(id);
  }

  @Post("/transfers/:id/start")
  @ApiOperation({ summary: "Start a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Param("id") id: string): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferStart(transfer);
  }

  @Post("/transfers/:id/completion")
  @ApiOperation({ summary: "Complete a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Param("id") id: string): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferComplete(transfer);
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
    @Query("reason", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferTerminate(transfer, code, reason);
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
    @Query("reason", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    const transfer = await this.transferHandler.getTransferById(id);
    await this.transferClientService.transferSuspend(transfer, reason);
  }

  @All("/transfers/:id/execute/*path")
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
    description: "Path of receiving application",
    schema: {
      type: "string | string[] | undefined"
    }
  })
  @ApiForbiddenResponseDefault()
  async executeTransfer(
    @Param("id") id: string,
    @Param("path") path: string | string[] | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response
  ): Promise<unknown> {
    this.logger.log(`Requesting transfer execution for id ${id}`);
    const normalizedPath = Array.isArray(path) ? path.join("/") : path || "";
    return await this.transferHandler.executeProxyRequest(
      id,
      normalizedPath,
      request,
      response
    );
  }

  @All("/execute/*path")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Proxy a request without transfer ID",
    description:
      "This endpoint is used if the HTTP Data Plane needs to serve as a proxy and the transfer hasn't been created yet. Used for automatic handling of the DSP."
  })
  @ApiParam({
    name: "path",
    required: true,
    description: "Path of receiving application",
    schema: {
      type: "string | string[] | undefined"
    }
  })
  @ApiForbiddenResponseDefault()
  async executeTransferWithoutId(
    @Param("path") path: string | string[] | undefined,
    @Headers("x-dataset-id") datasetId: string,
    @Headers("x-audience") audience: string,
    @Headers("x-controlplane-address") controlPlaneAddress: string,
    @Req()
    request: RawBodyRequest<Request>,
    @Res() response: Response
  ): Promise<unknown> {
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
    const transferId = await this.transferHandler.determineTransferId(
      datasetId,
      audience,
      controlPlaneAddress
    );
    const normalizedPath = Array.isArray(path) ? path.join("/") : path || "";
    return await this.transferHandler.executeProxyRequest(
      transferId,
      normalizedPath,
      request,
      response
    );
  }
}
