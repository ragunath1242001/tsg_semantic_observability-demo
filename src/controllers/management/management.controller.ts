import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { CatalogDto, DatasetDto } from "../../model/dsp/catalog/catalog.dto";
import { DspClientService } from "../../services/dsp/client.service";
import { ContractNegotiationDto } from "../../model/dsp/negotiation/messages.dto";
import { Offer } from "../../model/dsp/negotiation/negotiation";
import { OfferDto } from "../../model/dsp/negotiation/negotiation.dto";
import { DeserializePipe } from "../dsp/deserialize.pipe";
import { NegotiationConsumerService } from "../../services/dsp/negotiationConsumer.service";
import { TransferConsumerService } from "../../services/dsp/transferConsumer.service";
import { TransferRequestMessage, TransferStartMessage } from "../../model/dsp/transfer/messages";
import { TransferProcessDto, TransferRequestMessageDto, TransferStartMessageDto } from "../../model/dsp/transfer/messages.dto";

@Controller('management')
export class ManagementController {
  constructor(private readonly dsp: DspClientService, private readonly negotiationConsumerService: NegotiationConsumerService, private readonly transferConsumerService: TransferConsumerService) {}

  @Get("/catalog/request")
  @HttpCode(HttpStatus.OK)
  async requestCatalog(@Query() address: string): Promise<CatalogDto> {
    return this.dsp.requestCatalog(this.adaptAddress(address, "catalog", "request"));
  }

  @Get("/catalog/dataset")
  @HttpCode(HttpStatus.OK)
  async requestDataset(@Query() address: string, @Query() id: string): Promise<DatasetDto> {
    return this.dsp.requestDataset(this.adaptAddress(address, "catalog", "dataset"), id);
  }

  @Post("/negotiation/request")
  @HttpCode(HttpStatus.OK)
  async requestNegotiation(@Body(new DeserializePipe<OfferDto, Offer>()) body: Offer, @Query() address: string, @Query() processId?: string): Promise<ContractNegotiationDto> {
    const negotiationProcess = await this.negotiationConsumerService.initiateNegotiationProcess({
      offer: body,
      processId: processId
    })
    return this.dsp.requestNegotiation(this.adaptAddress(address, "negotiation"), negotiationProcess)
  }

  @Post("/transfer/request")
  @HttpCode(HttpStatus.OK)
  async requestTransfer(@Body(new DeserializePipe<TransferRequestMessageDto, TransferRequestMessage>()) body: TransferRequestMessage, @Query() address: string): Promise<TransferProcessDto> {
    const controlPlaneAddress = this.adaptAddress(address, "transfer", "request");
    const internalTransfer = await this.transferConsumerService.initiateTransferProcess(body, controlPlaneAddress.slice(0, -1*("/request".length)));
    return this.dsp.requestTransfer(controlPlaneAddress, internalTransfer.message)
  }
  @Post("/transfer/:processId/start")
  @HttpCode(HttpStatus.OK)
  async startTransfer(@Body(new DeserializePipe<TransferStartMessageDto, TransferStartMessage>()) body: TransferStartMessage, @Param() processId: string): Promise<TransferProcessDto> {
    const internalTransfer = await this.transferConsumerService.getTransfer(processId);
    if (internalTransfer === undefined) {
      throw new HttpException(`Internal transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    await this.transferConsumerService.handleStartTransferProcess(processId, body);
    
    return this.dsp.startTransfer(this.adaptAddress(address, "transfer", "request"), internalTransfer.message)
  }

  private adaptAddress(address: string, ...paths: string[]): string {
    const addressTmp = address.endsWith('/') ? address.slice(0,-1) : address;
    for (let i = 0; i < paths.length; i++) {
      const subpath = paths.slice(0, -i);
      if (addressTmp.endsWith(subpath.join('/'))) {
        return (i == 0) ? addressTmp : addressTmp + "/" + paths.slice(i).join("/");
      }
    }
    return addressTmp + paths.join("/");
  }
}