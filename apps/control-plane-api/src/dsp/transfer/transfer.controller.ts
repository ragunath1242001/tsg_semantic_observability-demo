import { Body, Controller, HttpStatus, Logger } from "@nestjs/common";
import {
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common/decorators";
import {
  CredentialSubject,
  toArray,
  TransferCompletionMessage,
  TransferProcessDto,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common-dsp";
import {
  TransferVerifiablePresentationGuard,
  VerifiablePresentationGuard,
} from "../../auth/verifiablePresentation.guard";
import { VP, VPId } from "../../auth/verifiablePresentation.strategy";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { TransferService } from "./transfer.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import {
  TransferRequestMessageSchema,
  TransferProcessSchema,
  TransferCompletionMessageSchema,
  TransferStartMessageSchema,
  TransferSuspensionMessageSchema,
  TransferTerminationMessageSchema,
} from "@tsg-dsp/common-dtos";

@ApiTags("Transfers")
@ApiBearerAuth()
@Controller("transfers")
export class TransferController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post("request")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Request a transfer" })
  @ApiBody({ type: TransferRequestMessageSchema })
  @ApiCreatedResponse({ type: TransferProcessSchema })
  async request(
    @Body(new DeserializePipe(TransferRequestMessage))
    body: TransferRequestMessage,
    @VPId() vpId: string,
    @VP() vp: VerifiablePresentation<VerifiableCredential<CredentialSubject>>
  ): Promise<TransferProcessDto> {
    this.logger.log(
      `Received transfer request from ${vpId}: ${JSON.stringify(body)}`
    );
    const result = await this.transferService.handleRequest(
      body,
      vpId,
      toArray(vp.verifiableCredential)
    );
    return await result.serialize();
  }

  @Get(":id")
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
    const transferProcess = await this.transferService.getTransfer(id, vpId);
    return await transferProcess.process.serialize();
  }

  @Post(":id/start")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferStartMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer started successfully",
    schema: { example: { status: "success" } },
  })
  async startTransferProcess(
    @Param("id") id: string,
    @Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage,
    @VPId() vpId: string
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received transfer start from ${vpId} for ${id}: ${JSON.stringify(body)}`
    );
    return await this.transferService.handleStart(id, body, vpId);
  }

  @Post(":id/complete")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferCompletionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer completed successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleComplete(id, body, vpId);
  }

  @Post(":id/terminate")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Terminate transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferTerminationMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer terminated successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleTerminate(id, body, vpId);
  }

  @Post(":id/suspend")
  @UseGuards(TransferVerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferSuspensionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transfer suspended successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleSuspend(id, body, vpId);
  }

  @Post("/callbacks/:id/start")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to start transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferStartMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback started transfer successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleStart(id, body, vpId);
  }

  @Post("/callbacks/:id/complete")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to complete transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferCompletionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback completed transfer successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleComplete(id, body, vpId);
  }

  @Post("/callbacks/:id/terminate")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to terminate transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferTerminationMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback terminated transfer successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleTerminate(id, body, vpId);
  }

  @Post("/callbacks/:id/suspend")
  @UseGuards(VerifiablePresentationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Callback to suspend transfer process" })
  @ApiParam({ name: "id", required: true, description: "Transfer ID" })
  @ApiBody({ type: TransferSuspensionMessageSchema })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Callback suspended transfer successfully",
    schema: { example: { status: "success" } },
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
    return await this.transferService.handleSuspend(id, body, vpId);
  }
}
