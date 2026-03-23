import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { DisableOAuthGuard, ProtocolAuditService } from "@tsg-dsp/common-api";
import {
  CredentialContainer,
  TransferCompletionMessage,
  TransferCompletionMessageSchema,
  TransferProcessDto,
  TransferProcessSchema,
  TransferRequestMessage,
  TransferRequestMessageSchema,
  TransferStartMessage,
  TransferStartMessageSchema,
  TransferSuspensionMessage,
  TransferSuspensionMessageSchema,
  TransferTerminationMessage,
  TransferTerminationMessageSchema
} from "@tsg-dsp/common-dsp";
import { Action, Resource } from "@tsg-dsp/common-dtos";

import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { TransferVerifiablePresentationGuard } from "../../vc-auth/transferVerifiablePresentation.guard.js";
import { VerifiablePresentationGuard } from "../../vc-auth/verifiablePresentation.guard.js";
import { VP, VPId } from "../../vc-auth/vp.decorators.js";
import { TransferService } from "./transfer.service.js";

@ApiTags("Transfers")
@ApiBearerAuth()
@Controller()
@DisableOAuthGuard()
export class TransferController {
  constructor(
    private readonly transferService: TransferService,
    private readonly protocolAuditService: ProtocolAuditService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post("transfers/request")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Request a transfer" })
  @ApiBody({ type: TransferRequestMessageSchema })
  @ApiCreatedResponse({ type: TransferProcessSchema })
  async request(
    @Body(new DeserializePipe(TransferRequestMessage))
    body: TransferRequestMessage,
    @VPId() vpId: string,
    @VP() vp: CredentialContainer[]
  ): Promise<TransferProcessDto> {
    this.logger.log(
      `Received transfer request from ${vpId}: ${JSON.stringify(body)}`
    );
    const result = await this.transferService.handleRequest(body, vpId, vp);
    await this.logAllowed(Action.CREATE, vpId, result.providerPid);
    return result.serialize();
  }

  @Get("transfers/:id")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get transfer status by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiResponse({ type: TransferProcessSchema })
  async getTransfer(
    @Param("id") id: string,
    @VPId() vpId: string
  ): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer status request from ${vpId} for ${id}`);
    const result = await this.transferService.getTransferProcessDto(id, vpId);
    await this.logAllowed(Action.READ, vpId, id);
    return result;
  }

  @Post("transfers/:id/start")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferStartMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer started successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async startTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer start from ${vpId} for ${id}: ${JSON.stringify(body)}`
    );
    const result = await this.transferService.handleStart(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Post("transfers/:id/completion")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferCompletionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer completed successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async completeTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferCompletionMessage))
    body: TransferCompletionMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer complete from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleComplete(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Post("transfers/:id/termination")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Terminate transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferTerminationMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer terminated successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async terminateTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferTerminationMessage))
    body: TransferTerminationMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer terminate from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleTerminate(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Post("transfers/:id/suspension")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferSuspensionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer suspended successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async suspendTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferSuspensionMessage))
    body: TransferSuspensionMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer suspend from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleSuspend(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Get("/callbacks/transfers/:id")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get transfer status by ID" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiResponse({ type: TransferProcessSchema })
  async callbackGetTransfer(
    @Param("id") id: string,
    @VPId() vpId: string
  ): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer status request from ${vpId} for ${id}`);
    const result = await this.transferService.getTransferProcessDto(id, vpId);
    await this.logAllowed(Action.READ, vpId, id);
    return result;
  }

  @Post("/callbacks/transfers/:id/start")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to start transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferStartMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback started transfer successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async callbackStartTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer callback start from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleStart(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Post("/callbacks/transfers/:id/completion")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to complete transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferCompletionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback completed transfer successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async callbackCompleteTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferCompletionMessage))
    body: TransferCompletionMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer callback complete from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleComplete(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Post("/callbacks/transfers/:id/termination")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to terminate transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferTerminationMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback terminated transfer successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async callbackTerminateTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferTerminationMessage))
    body: TransferTerminationMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer callback terminate from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleTerminate(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  @Post("/callbacks/transfers/:id/suspension")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to suspend transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferSuspensionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback suspended transfer successfully",
    schema: {
      type: "object",
      properties: { status: { type: "string" } },
      example: { status: "success" }
    }
  })
  async callbackSuspendTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferSuspensionMessage))
    body: TransferSuspensionMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer callback suspend from ${vpId} for ${id}: ${JSON.stringify(
        body
      )}`
    );
    const result = await this.transferService.handleSuspend(id, body, vpId);
    await this.logAllowed(Action.EXECUTE, vpId, id);
    return result;
  }

  private async logAllowed(action: Action, vpId: string, id?: string) {
    await this.protocolAuditService.logAllowed({
      caller: this.protocolAuditService.createPeerServiceActor(
        vpId,
        "remote-control-plane"
      ),
      action,
      resource: {
        type: Resource.CP_TRANSFER,
        id
      }
    });
  }
}
