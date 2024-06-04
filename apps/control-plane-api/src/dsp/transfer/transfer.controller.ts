import { Body, Controller, HttpStatus, Logger } from "@nestjs/common";
import {
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common/decorators";
import {
  TransferCompletionMessage,
  TransferProcessDto,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage,
} from "@tsg-dsp/common";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard";
import { VPId } from "../../auth/verifiablePresentation.strategy";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { TransferService } from "./transfer.service";

@UseGuards(VerifiablePresentationGuard)
@Controller("transfers")
export class TransferController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post("request")
  @HttpCode(HttpStatus.CREATED)
  async request(
    @Body(new DeserializePipe(TransferRequestMessage))
    body: TransferRequestMessage,
    @VPId() vpId: string
  ): Promise<TransferProcessDto> {
    this.logger.log(
      `Received transfer request from ${vpId}: ${JSON.stringify(body)}`
    );
    const result = await this.transferService.handleRequest(body, vpId);
    return await result.serialize();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getTransfer(
    @Param("id") id: string,
    @VPId() vpId: string
  ): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer status request from ${vpId} for ${id}`);
    const transferProcess = await this.transferService.getTransfer(id, vpId);
    return await transferProcess.process.serialize();
  }

  @Post(":id/start")
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
