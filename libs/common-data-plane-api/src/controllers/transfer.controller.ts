import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import {
  DataPlaneRequestResponseDto,
  TransferCompletionMessageDto,
  TransferCompletionMessageSchema,
  TransferRequestMessageDto,
  TransferRequestMessageSchema,
  TransferStartMessageDto,
  TransferStartMessageSchema,
  TransferSuspensionMessageDto,
  TransferSuspensionMessageSchema,
  TransferTerminationMessageDto,
  TransferTerminationMessageSchema
} from "@tsg-dsp/common-dsp";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { ITransferHandler } from "../interfaces/index.js";

/**
 * Shared transfer controller for data plane implementations
 * Handles all transfer lifecycle endpoints
 *
 * Usage: Import this controller in your data plane module along with
 * a TransferHandlerService implementation injected via ITransferHandler token
 */
@Controller("transfers")
@ApiTags("Data Plane")
@ApiOAuth2(["controlplane_dataplane"])
@Roles("controlplane_dataplane")
export class TransferController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(ITransferHandler) private readonly transferHandler: ITransferHandler
  ) {}

  @Post("request/:role")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request Transfer",
    description: "Requests a transfer from control plane to data plane."
  })
  @ApiBody({ type: TransferRequestMessageSchema })
  @ApiOkResponse({ type: DataPlaneRequestResponseDto })
  @ApiForbiddenResponseDefault()
  async requestTransfer(
    @Body() body: TransferRequestMessageDto,
    @Param("role") role: "provider" | "consumer",
    @Query("processId", nonEmptyStringPipe) processId: string,
    @Headers("x-remote-party") remoteParty: string,
    @Headers("x-dataset-id") datasetId: string
  ): Promise<DataPlaneRequestResponseDto> {
    this.logger.log(
      `Requesting transfer for ${remoteParty} as ${role} with processId ${processId}`
    );

    return await this.transferHandler.handleTransferRequest(
      body,
      role,
      processId,
      remoteParty,
      datasetId
    );
  }

  @Post(":id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Start transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferStartMessageSchema })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "Transfer started successfully"
  })
  async startTransfer(
    @Body() body: TransferStartMessageDto,
    @Param("id") id: string
  ): Promise<void> {
    this.logger.log(`Requesting transfer start for id ${id}`);
    return await this.transferHandler.handleTransferStart(body, id);
  }

  @Post(":id/completion")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Complete transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferCompletionMessageSchema })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "Transfer completed successfully"
  })
  async completeTransfer(
    @Body() body: TransferCompletionMessageDto,
    @Param("id") id: string
  ): Promise<void> {
    this.logger.log(`Requesting transfer complete for id ${id}`);
    await this.transferHandler.handleTransferComplete(body, id);
  }

  @Post(":id/termination")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Terminate transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferTerminationMessageSchema })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "Transfer terminated successfully"
  })
  async terminateTransfer(
    @Body() body: TransferTerminationMessageDto,
    @Param("id") id: string
  ): Promise<void> {
    this.logger.log(`Requesting transfer terminate for id ${id}`);
    await this.transferHandler.handleTransferTerminate(body, id);
  }

  @Post(":id/suspension")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Suspend transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferSuspensionMessageSchema })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "Transfer suspended successfully"
  })
  async suspendTransfer(
    @Body() body: TransferSuspensionMessageDto,
    @Param("id") id: string
  ): Promise<void> {
    this.logger.log(`Requesting transfer suspend for id ${id}`);
    await this.transferHandler.handleTransferSuspend(body, id);
  }
}
