import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Logger, Param, Post, Query, UseGuards } from "@nestjs/common";
import { DspClientService } from "../client/client.service";
import { TransferService } from "./transfer.service";
import { TransferProcessDto } from "@tsg-dsp/common";
import { normalizeAddress } from "../../utils/address";
import { DataPlaneAddressDto } from "@libs/dtos";
import { ManagementGuard } from "../../auth/management.guard";
import { TransferStatus } from "../../model/dsp/transfer/transfer";

@UseGuards(ManagementGuard)
@Controller('management/transfer')
export class TransferManagementController {
  constructor(private readonly dsp: DspClientService, private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  async getTransfers(): Promise<TransferStatus[]> {
    return this.transferService.getTransfers();
  }

  @Get(":processId")
  async getTransfer(@Param('processId') processId: string): Promise<TransferStatus> {
    const transfer = await this.transferService.getTransfer(processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND)
    }
    return transfer;
  }

  @Post("request")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(@Query('address') address: string, @Query('agreementId') agreementId: string, @Query('format') format: string, @Query('audience') audience: string): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer request for ${address} with agreementId ${agreementId} and format ${format}`);
    const controlPlaneAddress = normalizeAddress(address, 1, "transfer", "request");
    const internalTransfer = await this.transferService.initiateTransferProcess(agreementId, format, undefined, controlPlaneAddress, audience);
    return internalTransfer.process.serialize();
  }

  @Post(":processId/start")
  @HttpCode(HttpStatus.OK)
  async startTransfer(@Param('processId') processId: string, @Body() body?: DataPlaneAddressDto): Promise<{status: string}> {
    // TODO: Validate body
    this.logger.log(`Received transfer start for processId ${processId} with message ${JSON.stringify(body)}`);
    const internalTransfer = await this.transferService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return await this.transferService.start(processId, body, false);
  }

  @Post(":processId/complete")
  @HttpCode(HttpStatus.OK)
  async completeTransfer(@Param('processId') processId: string): Promise<{status: string}> {
    this.logger.log(`Received transfer complete for processId ${processId}`);
    const internalTransfer = await this.transferService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return await this.transferService.complete(processId, false);
  }
  
  @Post(":processId/terminate")
  @HttpCode(HttpStatus.OK)
  async terminateTransfer(@Param('processId') processId: string, @Body() body: {code: string, reason: string}): Promise<{status: string}> {
    // TODO: Validate body
    this.logger.log(`Received transfer terminate for processId ${processId} with code ${body.code} and reason ${body.reason}`);
    const internalTransfer = await this.transferService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return await this.transferService.terminate(processId, body.code, body.reason, false);
  }
  
  @Post(":processId/suspend")
  @HttpCode(HttpStatus.OK)
  async suspendTransfer(@Param('processId') processId: string, @Body() body: {reason: string}): Promise<{status: string}> {
    // TODO: Validate body
    this.logger.log(`Received transfer suspend for processId ${processId} with reason ${body.reason}`);
    const internalTransfer = await this.transferService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return await this.transferService.suspend(processId, body.reason, false);
  }
}