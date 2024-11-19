import { Injectable, Logger } from "@nestjs/common";
import {
  CatalogDto,
  CatalogRequestMessage,
  ContextDto,
  ContractAgreementMessage,
  ContractAgreementVerificationMessage,
  ContractNegotiationDto,
  ContractNegotiationEventMessage,
  ContractNegotiationTerminationMessage,
  ContractOfferMessage,
  ContractRequestMessage,
  DatasetDto,
  SerializableClass,
  TransferCompletionMessage,
  TransferProcessDto,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage
} from "@tsg-dsp/common-dsp";
import axios, { AxiosRequestConfig } from "axios";
import { AuthService } from "../../auth/auth.service";
import { DSPClientError } from "../../utils/errors/error";

@Injectable()
export class DspClientService {
  constructor(private readonly authService: AuthService) {}
  private readonly logger = new Logger(this.constructor.name);

  private readonly axios = axios.create({
    timeout: 30000
  });

  async requestCatalog(
    address: string,
    audience?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters?: Array<any>
  ): Promise<CatalogDto> {
    const catalogRequestMessage = new CatalogRequestMessage({
      filter: filters
    });
    return await this.executePost<CatalogDto, CatalogRequestMessage>(
      address,
      catalogRequestMessage,
      `Request catalog at ${address}`,
      audience
    );
  }

  async requestDataset(
    address: string,
    id: string,
    audience?: string
  ): Promise<DatasetDto> {
    return await this.executeGet<DatasetDto>(
      `${address}/${id}`,
      `Request dataset at ${address}`,
      audience
    );
  }

  async requestNegotiation(
    address: string,
    contractRequestMessage: ContractRequestMessage,
    audience?: string
  ): Promise<ContractNegotiationDto> {
    return await this.executePost<
      ContractNegotiationDto,
      ContractRequestMessage
    >(
      address,
      contractRequestMessage,
      `New contract request at ${address} with offer ${contractRequestMessage.offer.id} and callback ${contractRequestMessage.callbackAddress}`,
      audience
    );
  }
  async requestExistingNegotiation(
    address: string,
    contractRequestMessage: ContractRequestMessage,
    audience: string
  ): Promise<ContractNegotiationDto> {
    return await this.executePost<
      ContractNegotiationDto,
      ContractRequestMessage
    >(
      address,
      contractRequestMessage,
      `Exsiting contract request at ${address} with offer ${contractRequestMessage.offer.id} and callback ${contractRequestMessage.callbackAddress}`,
      audience
    );
  }
  async negotiationOffer(
    address: string,
    contractOfferMessage: ContractOfferMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<{ status: string }, ContractOfferMessage>(
      address,
      contractOfferMessage,
      `Making negotiation offer at ${address} for negotiation ${contractOfferMessage.consumerPid}`,
      audience
    );
  }
  async negotiationEvent(
    address: string,
    contractNegotiationEventMessage: ContractNegotiationEventMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<
      { status: string },
      ContractNegotiationEventMessage
    >(
      address,
      contractNegotiationEventMessage,
      `Creating negotiation event ${contractNegotiationEventMessage.eventType} at ${address} for negotiation ${contractNegotiationEventMessage.consumerPid}`,
      audience
    );
  }
  async negotiationAgreement(
    address: string,
    contractAgreementMessage: ContractAgreementMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<{ status: string }, ContractAgreementMessage>(
      address,
      contractAgreementMessage,
      `Contract agreement at ${address} for negotiation ${contractAgreementMessage.consumerPid}`,
      audience
    );
  }
  async negotiationVerification(
    address: string,
    contractAgreementVerificationMessage: ContractAgreementVerificationMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<
      { status: string },
      ContractAgreementVerificationMessage
    >(
      address,
      contractAgreementVerificationMessage,
      `Contract agreement verification at ${address} for negotiation ${contractAgreementVerificationMessage.consumerPid}`,
      audience
    );
  }
  async negotiationTermination(
    address: string,
    contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<
      { status: string },
      ContractNegotiationTerminationMessage
    >(
      address,
      contractNegotiationTerminationMessage,
      `Negotiation termination at ${address} for negotiation ${contractNegotiationTerminationMessage.consumerPid}`,
      audience
    );
  }

  async requestTransfer(
    address: string,
    transferRequestMessage: TransferRequestMessage,
    audience?: string
  ): Promise<TransferProcessDto> {
    return await this.executePost<TransferProcessDto, TransferRequestMessage>(
      address,
      transferRequestMessage,
      `Requesting transfer at ${address} for agreement ${transferRequestMessage.agreementId}`,
      audience
    );
  }
  async startTransfer(
    address: string,
    transferStartMessage: TransferStartMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<{ status: string }, TransferStartMessage>(
      address,
      transferStartMessage,
      `Starting transfer at ${address} for process ${transferStartMessage.consumerPid}`,
      audience
    );
  }
  async completeTransfer(
    address: string,
    transferCompletionMessage: TransferCompletionMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<
      { status: string },
      TransferCompletionMessage
    >(
      address,
      transferCompletionMessage,
      `Completing transfer at ${address} for process ${transferCompletionMessage.consumerPid}`,
      audience
    );
  }
  async terminateTransfer(
    address: string,
    transferTerminationMessage: TransferTerminationMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<
      { status: string },
      TransferTerminationMessage
    >(
      address,
      transferTerminationMessage,
      `Terminating transfer at ${address} for process ${transferTerminationMessage.consumerPid}`,
      audience
    );
  }
  async suspendTransfer(
    address: string,
    transferSuspensionMessage: TransferSuspensionMessage,
    audience: string
  ): Promise<{ status: string }> {
    return await this.executePost<
      { status: string },
      TransferSuspensionMessage
    >(
      address,
      transferSuspensionMessage,
      `Suspending transfer at ${address} for process ${transferSuspensionMessage.consumerPid}`,
      audience
    );
  }

  private async getToken(address: string, audience?: string): Promise<string> {
    let receiverDid = audience;
    if (!receiverDid) {
      const url = new URL(address);
      receiverDid = `did:web:${url.host.replace(":", "%3A")}`;
      this.logger.debug(
        `Estimated receiver DID from address: ${address} -> ${receiverDid}`
      );
    }
    return await this.authService.requestToken(receiverDid);
  }

  private async executeGet<Out>(
    address: string,
    message: string,
    audience?: string,
    config?: AxiosRequestConfig
  ): Promise<Out> {
    try {
      const response = await this.axios.get<Out>(address, {
        ...config,
        headers: {
          Authorization: `Bearer ${await this.getToken(address, audience)}`
        }
      });
      return response.data;
    } catch (err) {
      throw new DSPClientError(message, err).andLog(this.logger, "debug");
    }
  }

  private async executePost<Out, In extends SerializableClass<ContextDto>>(
    address: string,
    body: In,
    message: string,
    audience?: string,
    config?: AxiosRequestConfig
  ): Promise<Out> {
    try {
      const bodyDto = await body.serialize();
      const response = await this.axios.post<Out>(address, bodyDto, {
        ...config,
        headers: {
          Authorization: `Bearer ${await this.getToken(address, audience)}`
        }
      });
      this.logger.log(message);
      return response.data;
    } catch (err) {
      throw new DSPClientError(message, err).andLog(this.logger, "debug");
    }
  }
}
