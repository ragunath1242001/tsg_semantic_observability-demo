import { Injectable } from "@nestjs/common";
import {
  ContractAgreementMessage,
  ContractNegotiationEventMessage,
  ContractOfferMessage,
} from "../model/dsp/negotiation/messages";

@Injectable()
export class NegotiationConsumerService {

  async offerCallback(processId: string, contractOfferMessage: ContractOfferMessage): Promise<{status: string} | undefined> {
    if (processId == "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4") {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }

  async agreementCallback(processId: string, contractAgreementMessage: ContractAgreementMessage): Promise<{status: string} | undefined> {
    if (processId == "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4") {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }

  async eventCallback(processId: string, contractNegotiationEventMessage: ContractNegotiationEventMessage): Promise<{status: string} | undefined> {
    if (processId == "urn:uuid:40925b73-e6b7-40a3-b71f-28c550d1cec4") {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }
}
