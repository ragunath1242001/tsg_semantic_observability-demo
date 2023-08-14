import { Body, Controller, HttpException, HttpStatus } from "@nestjs/common";
import { Get, HttpCode, Param, Post, Res } from "@nestjs/common/decorators";
import { DeserializePipe } from "./deserialize.pipe";
import { Response } from "express";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { TransferCompletionMessageDto, TransferProcessDto, TransferRequestMessageDto, TransferStartMessageDto, TransferSuspensionMessageDto, TransferTerminationMessageDto } from "../../model/dsp/transfer/messages.dto";
import { TransferService } from "../../services/dsp/transfer.service";

@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe<TransferRequestMessageDto, TransferRequestMessage>()) body: TransferRequestMessage, @Res() response: Response): Promise<TransferProcessDto> {
    if (body instanceof TransferRequestMessage) {
      const result = await this.transferService.handleRequest(body);
      response.setHeader("Location", `/transfer/${result.processId}`);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTransfer(@Param('id') id: string): Promise<TransferProcessDto> {
    const transferProcess = await this.transferService.getTransfer(id);
    if (transferProcess?.process) {
      return transferProcess.process.serialize();
    } else {
      throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async startTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferStartMessageDto, TransferStartMessage>()) body: TransferStartMessage): Promise<{status: string}> {
    if (body instanceof TransferStartMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer start message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferService.handleStart(id, body);
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
  async completeTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferCompletionMessageDto, TransferCompletionMessage>()) body: TransferCompletionMessage): Promise<{status: string}> {
    if (body instanceof TransferCompletionMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer completion message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferService.handleComplete(id, body);
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
  async terminateTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferTerminationMessageDto, TransferTerminationMessage>()) body: TransferTerminationMessage): Promise<{status: string}> {
    if (body instanceof TransferTerminationMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer completion message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferService.handleTerminate(id, body);
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
  async suspendTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferSuspensionMessageDto, TransferSuspensionMessage>()) body: TransferSuspensionMessage): Promise<{status: string}> {
    if (body instanceof TransferSuspensionMessage) {
      if (body.processId === undefined || body.processId !== id) {
        throw new HttpException('Missing or mismatch processId field in transfer completion message', HttpStatus.BAD_REQUEST);
      }
      const result = await this.transferService.handleSuspend(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Post('/callbacks/:id/start')
  @HttpCode(HttpStatus.OK)
  async callbackStartTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferStartMessageDto, TransferStartMessage>()) body: TransferStartMessage): Promise<{status: string}> {
    if (body instanceof TransferStartMessage) {
      const result = await this.transferService.handleStart(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post('/callbacks/:id/complete')
  @HttpCode(HttpStatus.OK)
  async callbackCompleteTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferCompletionMessageDto, TransferCompletionMessage>()) body: TransferCompletionMessage): Promise<{status: string}> {
    if (body instanceof TransferCompletionMessage) {
      const result = await this.transferService.handleComplete(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post('/callbacks/:id/terminate')
  @HttpCode(HttpStatus.OK)
  async callbackTerminateTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferTerminationMessageDto, TransferTerminationMessage>()) body: TransferTerminationMessage): Promise<{status: string}> {
    if (body instanceof TransferTerminationMessage) {
      const result = await this.transferService.handleTerminate(id, body);
      if (result === undefined) {
        throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'OK'
      };
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }
  
  @Post('/callbacks/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async callbackSuspendTransferProcess(@Param('id') id: string, @Body(new DeserializePipe<TransferSuspensionMessageDto, TransferSuspensionMessage>()) body: TransferSuspensionMessage): Promise<{status: string}> {
    if (body instanceof TransferSuspensionMessage) {
      const result = await this.transferService.handleSuspend(id, body);
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
