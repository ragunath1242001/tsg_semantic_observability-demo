import { Body, Controller, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Get, HttpCode, Param, Post, Res } from "@nestjs/common/decorators";
import { DeserializePipe } from "./deserialize.pipe";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { TransferCompletionMessageDto, TransferProcessDto, TransferRequestMessageDto, TransferStartMessageDto, TransferSuspensionMessageDto, TransferTerminationMessageDto } from "../../model/dsp/transfer/messages.dto";
import { TransferService } from "../../services/dsp/transfer.service";

@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async request(@Body(new DeserializePipe(TransferRequestMessage)) body: TransferRequestMessage): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer request: ${JSON.stringify(body)}`);
    if (body instanceof TransferRequestMessage) {
      const result = await this.transferService.handleRequest(body);
      return await result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTransfer(@Param('id') id: string): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer status request for ${id}`);
    const transferProcess = await this.transferService.getTransfer(id);
    if (transferProcess?.process) {
      return await transferProcess.process.serialize();
    } else {
      throw new HttpException('Transfer process not found', HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async startTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer start for ${id}: ${JSON.stringify(body)}`);
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
  async completeTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferCompletionMessage)) body: TransferCompletionMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer complete for ${id}: ${JSON.stringify(body)}`);
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
  async terminateTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferTerminationMessage)) body: TransferTerminationMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer terminate for ${id}: ${JSON.stringify(body)}`);
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
  async suspendTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferSuspensionMessage)) body: TransferSuspensionMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer suspend for ${id}: ${JSON.stringify(body)}`);
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
  async callbackStartTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer callback start for ${id}: ${JSON.stringify(body)}`);
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
  async callbackCompleteTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferCompletionMessage)) body: TransferCompletionMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer callback complete for ${id}: ${JSON.stringify(body)}`);
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
  async callbackTerminateTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferTerminationMessage)) body: TransferTerminationMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer callback terminate for ${id}: ${JSON.stringify(body)}`);
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
  async callbackSuspendTransferProcess(@Param('id') id: string, @Body(new DeserializePipe(TransferSuspensionMessage)) body: TransferSuspensionMessage): Promise<{status: string}> {
    this.logger.log(`Received transfer callback suspend for ${id}: ${JSON.stringify(body)}`);
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
