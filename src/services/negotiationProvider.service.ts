import { Injectable } from "@nestjs/common";
import {
  ContractAgreementVerificationMessage,
  ContractNegotiation,
  ContractNegotiationEventMessage,
  ContractNegotiationTerminationMessage,
  ContractRequestMessage,
} from "../model/dsp/negotiation/messages";
import { ContractNegotiationState } from "../model/dsp/negotiation/messages.schema";

@Injectable()
export class NegotiationProviderService {
  async getNegotiation(
    processId: string
  ): Promise<ContractNegotiation | undefined> {
    if (processId === "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c") {
      return new ContractNegotiation({
        id: "urn:uuid:09b15239-8775-4de3-8441-c0d2b59cdf54",
        processId: processId,
        contractNegotiationState: ContractNegotiationState.REQUESTED,
      });
    } else {
      return undefined;
    }
  }

  async request(
    requestMessage: ContractRequestMessage
  ): Promise<ContractNegotiation> {
    return new ContractNegotiation({
      id: "urn:uuid:09b15239-8775-4de3-8441-c0d2b59cdf54",
      processId:
        requestMessage.processId ||
        "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
      contractNegotiationState: ContractNegotiationState.REQUESTED,
    });
  }

  async negotiationEvent(
    processId: string,
    negotiationEventMessage: ContractNegotiationEventMessage
  ): Promise<{status: string} | undefined> {
    if (processId === "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c") {
      return {
        status: "OK",
      };
    } else {
      return undefined;
    }
  }
  async agreementVerification(
    processId: string,
    contractAgreementVerificationMessage: ContractAgreementVerificationMessage
  ): Promise<{status: string} | undefined> {
    if (processId === "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c") {
      return {
        status: "OK",
      };
    } else {
      return undefined;
    }
  }
  async negotiationTermination(
    processId: string,
    contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage
  ): Promise<{status: string} | undefined> {
    if (processId === "urn:uuid:63f0abdb-ef13-42a4-acb0-567ba5c2c41c") {
      return {
        status: "OK",
      };
    } else {
      return undefined;
    }
  }


}
