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
  Query
} from "@nestjs/common";
import { TransferService } from "./transfer.service.js";
import { Request, Response } from "express";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { ApiForbiddenResponseDefault, TransferDto } from "@tsg-dsp/common-dtos";
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { DataPlaneClientError } from "../utils/errors/error.js";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import { MetadataDto } from "../dataplane/dataplane.schemas.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("/management")
@Roles("controlplane_dataplane")
export class TransferManagementController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/transfers")
  @ApiOperation({ summary: "Get all transfers" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransferDto] })
  @ApiForbiddenResponseDefault()
  async getTransfers(): Promise<TransferDto[]> {
    return await this.transferService.getTransfers();
  }

  @Get("/transfers/:id")
  @ApiOperation({ summary: "Get transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.OK, type: TransferDto })
  @ApiForbiddenResponseDefault()
  async getTransfer(@Param("id") id: string): Promise<TransferDto> {
    return await this.transferService.getTransferById(id);
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
    return await this.transferService.getMetadata(id);
  }

  @Post("/transfers/:id/start")
  @ApiOperation({ summary: "Start a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Param("id") id: string): Promise<void> {
    return await this.transferService.transferStart(id);
  }

  @Post("/transfers/:id/complete")
  @ApiOperation({ summary: "Complete a transfer by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer identifier" })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Param("id") id: string): Promise<void> {
    return await this.transferService.transferComplete(id);
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
    @Query("code", nonEmptyStringPipe) code: string,
    @Query("reason", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    return await this.transferService.transferTerminate(id, code, reason);
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
    @Query("code", nonEmptyStringPipe) reason: string
  ): Promise<void> {
    return await this.transferService.transferSuspend(id, reason);
  }

  @All("/transfers/:id/execute{/*path}")
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
    return await this.transferService.executeProxyRequest(
      id,
      path,
      request,
      response
    );
  }

  @All("/execute{/*path}")
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
    const transferId = await this.transferService.determineTransferId(
      datasetId,
      audience,
      controlPlaneAddress
    );
    return await this.transferService.executeProxyRequest(
      transferId,
      path,
      request,
      response
    );
  }
}
