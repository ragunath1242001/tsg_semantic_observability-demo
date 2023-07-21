import { Body, Controller, HttpException, HttpStatus } from "@nestjs/common";
import { Get, HttpCode, Param, Post, Res } from "@nestjs/common/decorators";
import { DeserializePipe } from "./deserialize.pipe";
import { Response } from "express";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { LDTransferCompletionMessage, LDTransferProcess, LDTransferRequestMessage, LDTransferStartMessage, LDTransferSuspensionMessage, LDTransferTerminationMessage } from "../../model/dsp/transfer/messages.schema";
import { TransferConsumerService } from "../../services/transferConsumer.service";
import { TransferProviderService } from "../../services/transferProvider.service";

@Controller('transfer')
export class TransferController {
  constructor(
    private readonly transferProviderService: TransferProviderService, 
    private readonly transferConsumerService: TransferConsumerService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe<LDTransferRequestMessage, TransferRequestMessage>()) body: TransferRequestMessage, @Res() response: Response): Promise<LDTransferProcess> {
    if (body instanceof TransferRequestMessage) {
      const result = await this.transferProviderService.request(body);
      response.setHeader("Location", `/transfer/${result.processId}`);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTransfer(@Param('id') id: string): Promise<LDTransferProcess> {
    const transferProcess = await this.transferProviderService.getTransferProcess(id);
    if (transferProcess) {
      return transferProcess.serialize();
    } else {
      throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async startTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferStartMessage, TransferStartMessage>()) body: TransferStartMessage): Promise<{status: string}> {
    if (body instanceof TransferStartMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer start message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferProviderService.startTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferCompletionMessage, TransferCompletionMessage>()) body: TransferCompletionMessage): Promise<{status: string}> {
    if (body instanceof TransferCompletionMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer completion message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferProviderService.completeTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminateTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferTerminationMessage, TransferTerminationMessage>()) body: TransferTerminationMessage): Promise<{status: string}> {
    if (body instanceof TransferTerminationMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer completion message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferProviderService.terminateTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferSuspensionMessage, TransferSuspensionMessage>()) body: TransferSuspensionMessage): Promise<{status: string}> {
    if (body instanceof TransferSuspensionMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer completion message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferProviderService.suspendTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Post('/callback/:id/start')
  @HttpCode(HttpStatus.OK)
  async callbackStartTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferStartMessage, TransferStartMessage>()) body: TransferStartMessage): Promise<{status: string}> {
    if (body instanceof TransferStartMessage) {
      const result = await this.transferConsumerService.startTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post('/callback/:id/complete')
  @HttpCode(HttpStatus.OK)
  async callbackCompleteTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferCompletionMessage, TransferCompletionMessage>()) body: TransferCompletionMessage): Promise<{status: string}> {
    if (body instanceof TransferCompletionMessage) {
      const result = await this.transferConsumerService.completeTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post('/callback/:id/terminate')
  @HttpCode(HttpStatus.OK)
  async callbackTerminateTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferTerminationMessage, TransferTerminationMessage>()) body: TransferTerminationMessage): Promise<{status: string}> {
    if (body instanceof TransferTerminationMessage) {
      const result = await this.transferConsumerService.terminateTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post('/callback/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async callbackSuspendTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<LDTransferSuspensionMessage, TransferSuspensionMessage>()) body: TransferSuspensionMessage): Promise<{status: string}> {
    if (body instanceof TransferSuspensionMessage) {
      const result = await this.transferConsumerService.suspendTransferProcess(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

}
