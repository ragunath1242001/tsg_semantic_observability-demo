import { Body, Controller, DefaultValuePipe, Get, HttpCode, HttpException, HttpStatus, Logger, Param, ParseBoolPipe, Post, Query } from "@nestjs/common";
import { CatalogDto, DatasetDto } from "../../model/dsp/catalog/catalog.dto";
import { DspClientService } from "../../services/dsp/client.service";
import { ContractNegotiationDto } from "../../model/dsp/negotiation/messages.dto";
import { Offer } from "../../model/dsp/negotiation/negotiation";
import { OfferDto } from "../../model/dsp/negotiation/negotiation.dto";
import { DeserializePipe } from "../dsp/deserialize.pipe";
import { TransferRequestMessage, TransferStartMessage } from "../../model/dsp/transfer/messages";
import { TransferProcessDto, TransferRequestMessageDto, TransferStartMessageDto } from "../../model/dsp/transfer/messages.dto";
import { NegotiationService } from "../../services/dsp/negotiation.service";
import { TransferService } from "../../services/dsp/transfer.service";

@Controller('management')
export class ManagementController {
  constructor(private readonly dsp: DspClientService, private readonly negotiationService: NegotiationService, private readonly transferService: TransferService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/catalog/request")
  @HttpCode(HttpStatus.OK)
  async requestCatalog(@Query('address') address: string): Promise<CatalogDto> {
    this.logger.log(`Received catalog request for ${address}`);
    return this.dsp.requestCatalog(this.adaptAddress(address, "catalog", "request"));
  }

  @Get("/catalog/dataset")
  @HttpCode(HttpStatus.OK)
  async requestDataset(@Query('address') address: string, @Query('id') id: string): Promise<DatasetDto> {
    this.logger.log(`Received dataset request for ${address} with id ${id}`);
    return this.dsp.requestDataset(this.adaptAddress(address, "catalog", "dataset"), id);
  }

  @Post("/negotiation/request")
  @HttpCode(HttpStatus.OK)
  async requestNegotiation(@Body(new DeserializePipe(Offer)) body: Offer, @Query('address') address: string, @Query('processId') processId?: string): Promise<ContractNegotiationDto> {
    this.logger.log(`Received negotiation request for ${address} with offer ${JSON.stringify(body)}`);
    const negotiationProcess = await this.negotiationService.requestNew(body, address);
    return negotiationProcess.serialize();
  }

  @Post("/transfer/request")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(@Query('address') address: string, @Query('agreementId') agreementId: string, @Query('format') format: string): Promise<TransferProcessDto> {
    this.logger.log(`Received transfer request for ${address} with agreementId ${agreementId} and format ${format}`);
    const controlPlaneAddress = this.adaptAddress(address, "transfer", "request");
    const internalTransfer = await this.transferService.initiateTransferProcess(agreementId, format, undefined, controlPlaneAddress.slice(0, -1*("/request".length)));
    return internalTransfer.process.serialize();
  }

  @Post("/transfer/:processId/start")
  @HttpCode(HttpStatus.OK)
  async startTransfer(@Body(new DeserializePipe(TransferStartMessage)) body: TransferStartMessage, @Param('processId') processId: string, @Query('dataPlane', new DefaultValuePipe(false), ParseBoolPipe) dataPlane: boolean): Promise<{status: string} | undefined> {
    this.logger.log(`Received transfer start for processId ${processId} with message ${JSON.stringify(body)}`);
    const internalTransfer = await this.transferService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return await this.transferService.start(processId, body, dataPlane);
  }

  @Post("/transfer/:processId/complete")
  @HttpCode(HttpStatus.OK)
  async completeTransfer(@Param('processId') processId: string, @Query('dataPlane', new DefaultValuePipe(false), ParseBoolPipe) dataPlane: boolean): Promise<{status: string} | undefined> {
    this.logger.log(`Received transfer complete for processId ${processId}`);
    const internalTransfer = await this.transferService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    return await this.transferService.complete(processId, dataPlane);
  }

  private adaptAddress(address: string, ...paths: string[]): string {
    const addressTmp = address.endsWith('/') ? address.slice(0,-1) : address;
    for (let i = 0; i < paths.length; i++) {
      const subpath = paths.slice(0, paths.length-i);
      if (addressTmp.endsWith(subpath.join('/'))) {
        return (i == 0) ? addressTmp : addressTmp + "/" + paths.slice(i).join("/");
      }
    }
    return addressTmp + "/" + paths.join("/");
  }
}