import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Logger, Module, Param, Post, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DeserializePipe } from '../controllers/dsp/deserialize.pipe';
import { DataPlaneAddressDto, DataPlaneCreation, DataPlaneDetailsDto, DataPlaneRequestResponseDto } from '../model/data-planes/dataPlanes.dto';
import { DataAddress, TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from '../model/dsp/transfer/messages';
import { TransferCompletionMessageDto, TransferRequestMessageDto, TransferStartMessageDto, TransferState, TransferSuspensionMessageDto, TransferTerminationMessageDto } from '../model/dsp/transfer/messages.dto';
import crypto from "crypto";
import axios from 'axios';
import { DataService, Dataset, Distribution } from '../model/dsp/catalog/catalog';

interface Transfer {
  role: "provider" | "consumer",
  id: string,
  processId: string,
  state: TransferState,
  request: TransferRequestMessage,
  response: DataPlaneRequestResponseDto
}


@Controller()
export class DataPlaneTestController {
  private readonly logger = new Logger(this.constructor.name);
  constructor() {
    setTimeout(async () => {
      const config: DataPlaneCreation = {
        dataplaneType: 'dspace:HTTP',
        endpointPrefix: 'http://localhost:3001/data',
        callbackAddress: 'http://localhost:3001',
        managementAddress: 'http://localhost:3001',
        managementToken: 'ABCDEFGHIJ',
        catalogSynchronization: "push",
        role: "both"
      }
      const details = await axios.post<DataPlaneDetailsDto>('http://localhost:3000/data-plane/init', config);
      await axios.post(
        `http://localhost:3000/data-plane/${details.data.identifier}/catalog`,
        await new Dataset({
          id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
          title: 'Test HTTP dataset',
          distribution: [
            new Distribution({
              id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
              format: "dspace:HTTP",
              accessService: [
                new DataService({
                  id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
                  endpointURL: "http://localhost:3000"
                })
              ]
            })
          ]
        }).serialize()
      );
    }, 1000)
  }

  private readonly transfers: Transfer[] = []

  @Get("/catalog")
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async getCatalog(){}

  @Get("/health")
  @HttpCode(HttpStatus.OK)
  async healthCheck(){}

  @Post("/transfer/request/:role")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(@Body(new DeserializePipe(TransferRequestMessage)) body: TransferRequestMessage, @Param('role') role: "provider" | "consumer", @Query("processId") processId: string): Promise<DataPlaneRequestResponseDto> {
    this.logger.log(`Requesting transfer for ${role} with processId ${processId} and with message: ${JSON.stringify(body)}`)
    const id = crypto.randomUUID();
    let dataAddress: DataPlaneAddressDto | undefined;
    if (role === "provider") {
      dataAddress = {
        endpoint: `http://localhost:3001/data/${id}`,
        properties: [{
          name: 'Authorization',
          value: `Bearer ${id}`
        }]
      }
    }
    const transfer: Transfer = {
      role: role,
      id: id,
      processId: processId,
      state: TransferState.REQUESTED,
      request: body,
      response: {
        accepted: true,
        identifier: id,
        dataAddress: dataAddress
      }
    }
    this.transfers.push(transfer);
    return transfer.response;
  }

  @Post("/transfer/:id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  async startTransfer(@Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage, @Param('id') id: string): Promise<void> {
    this.logger.log(`Requesting transfer start for id ${id}, with message:${JSON.stringify(body)}`);
    const transfer = this.transfers.find(transfer => transfer.id === id);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${id} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.STARTED;
    if (transfer.role === "consumer") {
      if (body.dataAddress === undefined) {
        throw Error(`Expected dataAddress in TransferStartMessage`);
      }
      const dataAddress = body.dataAddress;
      setTimeout(async () => {
        await this.executePull(dataAddress);
        await axios.post(`http://localhost:3000/management/transfer/${transfer.processId}/complete`);
      }, 1000);
    }
  }

  async executePull(dataAddress: DataAddress): Promise<void> {
    try {
      this.logger.log(`Executing pull to ${dataAddress.endpoint} with Authorization ${dataAddress.endpointProperties.find(p => p.name === 'Authorization')?.value}`)
      const result = await axios.get(dataAddress.endpoint, {
        headers: {
          'Authorization': dataAddress.endpointProperties.find(p => p.name === 'Authorization')?.value
        }
      });
      this.logger.log(`Executing pull successful: ${JSON.stringify(result.data)}`);
    } catch (e) {
      this.logger.log(`Error in executing pull: ${e}`);
    }
  }

  @Post("/transfer/:id/complete")
  @HttpCode(HttpStatus.ACCEPTED)
  async completeTransfer(@Body(new DeserializePipe(TransferCompletionMessage)) body: TransferCompletionMessage, @Param('id') id: string): Promise<void> {
    this.logger.log(`Requesting transfer complete for id ${id}, with message:${JSON.stringify(body)}`);
    const transfer = this.transfers.find(transfer => transfer.id === id);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${id} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.COMPLETED;
    
  }

  @Post("/transfer/:id/terminate")
  @HttpCode(HttpStatus.ACCEPTED)
  async terminateTransfer(@Body(new DeserializePipe(TransferTerminationMessage)) body: TransferTerminationMessage, @Param('id') id: string): Promise<void> {
    this.logger.log(`Requesting transfer terminate for id ${id}, with message:${JSON.stringify(body)}`);
    const transfer = this.transfers.find(transfer => transfer.id === id);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${id} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.TERMINATED;
    
  }

  @Post("/transfer/:id/suspend")
  @HttpCode(HttpStatus.ACCEPTED)
  async suspendTransfer(@Body(new DeserializePipe(TransferSuspensionMessage)) body: TransferSuspensionMessage, @Param('id') id: string): Promise<void> {
    this.logger.log(`Requesting transfer suspend for id ${id}, with message:${JSON.stringify(body)}`);
    const transfer = this.transfers.find(transfer => transfer.id === id);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${id} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.SUSPENDED;
  }

  @Get("/data/:id")
  async getData(@Param('id') id: string, @Headers('Authorization') authorization: string): Promise<any> {
    this.logger.log(`Received data request for transfer ${id}`);
    const transfer = this.transfers.find(transfer => transfer.id === id);
    await new Promise(f => setTimeout(f, 2000));
    return {
      result: 'Test Data',
      id: id
    }
  }

}

@Module({
  imports: [],
  controllers: [DataPlaneTestController],
})
export class DataPlaneTestModule {}

@Module({
  imports: [DataPlaneTestModule],
  exports: [DataPlaneTestModule]
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
}
bootstrap();
