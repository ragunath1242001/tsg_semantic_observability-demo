import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { CatalogDto, DatasetDto } from "../../model/dsp/catalog/catalog.dto";
import { CatalogRequestMessage, Filter } from "../../model/dsp/catalog/messages";
import { SerializableClass } from "../../model/dsp/common";
import { ContextDto } from "../../model/dsp/common.dto";
import { ContractNegotiationDto } from "../../model/dsp/negotiation/messages.dto";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { TransferProcessDto } from "../../model/dsp/transfer/messages.dto";

export class DSPClientError extends Error {
  err: unknown;
  status?: number;
  constructor(message: string, err: unknown) {
    super()
    let status: number | undefined;
    let errorMessage;
    if (axios.isAxiosError(err)) {
      if (err.response) {
        errorMessage = `${message} (response): ${err.response.status} ${JSON.stringify(err.response.data)}`;
        status = err.response.status;
      } else {
        errorMessage = `${message} (request): ${err.message}`
        status = err.status
      }
    } else { 
      errorMessage = `${message} (unknown): ${err}`;
    }
    this.name = 'DSPClientError';
    this.message = errorMessage;
    this.status = status;
    this.err = err;
  }
}

@Injectable()
export class DspClientService {
  private readonly logger = new Logger(this.constructor.name);

  private readonly axios = axios.create({
    timeout: 30000
  });
  
  async requestCatalog(address: string, filters?: Array<Filter>): Promise<CatalogDto> {
    const catalogRequestMessage = new CatalogRequestMessage({
      filter: filters
    });
    return await this.executePost<CatalogDto, CatalogRequestMessage>(address, catalogRequestMessage, `Request catalog at ${address}`);
  }

  async requestDataset(address: string, id: string): Promise<DatasetDto> {
    return await this.executeGet<DatasetDto>(`${address}/${id}`, `Request catalog at ${address}`);
  }

  async requestNegotiation(address: string, contractRequestMessage: ContractRequestMessage): Promise<ContractNegotiationDto> {
    return await this.executePost<ContractNegotiationDto, ContractRequestMessage>(address, contractRequestMessage, `New contract request at ${address} with offer ${contractRequestMessage.offer.id} and callback ${contractRequestMessage.callbackAddress}`);
  }
  async requestExistingNegotiation(address: string, contractRequestMessage: ContractRequestMessage): Promise<ContractNegotiationDto> {
    return await this.executePost<ContractNegotiationDto, ContractRequestMessage>(address, contractRequestMessage, `Exsiting contract request at ${address} with offer ${contractRequestMessage.offer.id} and callback ${contractRequestMessage.callbackAddress}`);
  }
  async negotiationOffer(address: string, contractOfferMessage: ContractOfferMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, ContractOfferMessage>(address, contractOfferMessage, `Making negotiation offer at ${address} for negotiation ${contractOfferMessage.processId}`);
  }
  async negotiationEvent(address: string, contractNegotiationEventMessage: ContractNegotiationEventMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, ContractNegotiationEventMessage>(address, contractNegotiationEventMessage, `Creating negotiation event ${contractNegotiationEventMessage.eventType} at ${address} for negotiation ${contractNegotiationEventMessage.processId}`);
  }
  async negotiationAgreement(address: string, contractAgreementMessage: ContractAgreementMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, ContractAgreementMessage>(address, contractAgreementMessage, `Contract agreement at ${address} for negotiation ${contractAgreementMessage.processId}`);
  }
  async negotiationVerification(address: string, contractAgreementVerificationMessage: ContractAgreementVerificationMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, ContractAgreementVerificationMessage>(address, contractAgreementVerificationMessage, `Contract agreement verification at ${address} for negotiation ${contractAgreementVerificationMessage.processId}`);
  }
  async negotiationTermination(address: string, contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, ContractNegotiationTerminationMessage>(address, contractNegotiationTerminationMessage, `Negotiation termination at ${address} for negotiation ${contractNegotiationTerminationMessage.processId}`);
  }


  async requestTransfer(address: string, transferRequestMessage: TransferRequestMessage): Promise<TransferProcessDto> {
    return await this.executePost<TransferProcessDto, TransferRequestMessage>(address, transferRequestMessage, `Requesting transfer at ${address} for agreement ${transferRequestMessage.agreementId}`)
  }
  async startTransfer(address: string, transferStartMessage: TransferStartMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, TransferStartMessage>(address, transferStartMessage, `Starting transfer at ${address} for process ${transferStartMessage.processId}`)
  }
  async completeTransfer(address: string, transferCompletionMessage: TransferCompletionMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, TransferCompletionMessage>(address, transferCompletionMessage, `Completing transfer at ${address} for process ${transferCompletionMessage.processId}`)
  }
  async terminateTransfer(address: string, transferTerminationMessage: TransferTerminationMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, TransferTerminationMessage>(address, transferTerminationMessage, `Terminating transfer at ${address} for process ${transferTerminationMessage.processId}`)
  }
  async suspendTransfer(address: string, transferSuspensionMessage: TransferSuspensionMessage): Promise<{status: string}> {
    return await this.executePost<{status: string}, TransferSuspensionMessage>(address, transferSuspensionMessage, `Suspending transfer at ${address} for process ${transferSuspensionMessage.processId}`)
  }

  private async executeGet<Out>(address: string, message: string, config?: AxiosRequestConfig): Promise<Out> {
    try {
      const response = await this.axios.get<Out>(address, config);
      return response.data;
    } catch (err) {
      throw new DSPClientError(message, err);
    }
  }

  private async executePost<Out, In extends SerializableClass<ContextDto>>(address: string, body: In, message: string, config?: AxiosRequestConfig): Promise<Out> {
    try {
      const bodyDto = await body.serialize();
      const response = await this.axios.post<Out>(address, bodyDto, config);
      this.logger.log(message);
      return response.data;
    } catch (err) {
      throw new DSPClientError(message, err);
    }
  }
}