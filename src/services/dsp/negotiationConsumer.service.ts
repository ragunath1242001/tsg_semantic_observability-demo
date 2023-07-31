import { Injectable } from "@nestjs/common";
import {
  ContractAgreementMessage,
  ContractNegotiationEventMessage,
  ContractNegotiationTerminationMessage,
  ContractOfferMessage,
  ContractRequestMessage,
  IContractRequestMessage,
} from "../../model/dsp/negotiation/messages";
import { Agreement, Offer } from "../../model/dsp/negotiation/negotiation";
import { Multilanguage } from "../../model/dsp/common";
import { NegotiationProviderService } from "./negotiationProvider.service";
import crypto from "crypto";
import { ContractNegotiationState, NegotiationEvent } from "../../model/dsp/negotiation/messages.dto";

interface NegotiationConsumerStatus {
  negotiation: ContractRequestMessage,
  state: ContractNegotiationState,
  offer?: Offer,
  agreement?: Agreement,
  termination?: {
    code?: string,
    reason: Multilanguage[]
  }
}

@Injectable()
export class NegotiationConsumerService {
  private readonly contractNegotiations: NegotiationConsumerStatus[] = []

  async getNegotiation(processId: string): Promise<NegotiationConsumerStatus | undefined> {
    return this.contractNegotiations.find(negotiationStatus => negotiationStatus.negotiation.processId === processId)
  } 

  async initiateNegotiationProcess(negotiation: Partial<IContractRequestMessage>): Promise<ContractRequestMessage> {
    const processId = negotiation.processId 
      || `urn:uuid:${crypto.randomUUID()}`;
    if (await this.getNegotiation(processId)) {
      throw Error(`Contract negotiation with process ID ${processId} already exists`);
    }
    const contractRequestMessage = new ContractRequestMessage({
      processId: processId,
      offer: negotiation.offer!,
      callbackAddress: `http://localhost/negotiation/callback/${processId}`
    })
    this.contractNegotiations.push({
      negotiation: contractRequestMessage,
      state: ContractNegotiationState.REQUESTED
    });
    return contractRequestMessage;
  }


  async offerCallback(processId: string, contractOfferMessage: ContractOfferMessage): Promise<{status: string} | undefined> {
    const negotiationStatus = await this.getNegotiation(processId);
    if (negotiationStatus === undefined) {
      return undefined;
    }
    if (negotiationStatus.state !== ContractNegotiationState.REQUESTED) {
      throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${negotiationStatus.state} to dspace:OFFERED`)
    }
    negotiationStatus.offer = contractOfferMessage.offer;
    negotiationStatus.state = ContractNegotiationState.OFFERED;
    return {
      status: 'OK'
    }
  }

  async agreementCallback(processId: string, contractAgreementMessage: ContractAgreementMessage): Promise<{status: string} | undefined> {
    const negotiationStatus = await this.getNegotiation(processId);
    if (negotiationStatus === undefined) {
      return undefined;
    }
    if (negotiationStatus.state !== ContractNegotiationState.REQUESTED && negotiationStatus.state !== ContractNegotiationState.ACCEPTED) {
      throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${negotiationStatus.state} to dspace:AGREED`)
    }
    negotiationStatus.agreement = contractAgreementMessage.agreement;
    negotiationStatus.state = ContractNegotiationState.VERIFIED;
    return {
      status: 'OK'
    }
  }

  async eventCallback(processId: string, contractNegotiationEventMessage: ContractNegotiationEventMessage): Promise<{status: string} | undefined> {
    const negotiationStatus = await this.getNegotiation(processId);
    if (negotiationStatus === undefined) {
      return undefined;
    }
    if (contractNegotiationEventMessage.eventType === NegotiationEvent.ACCEPTED) {
      throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${negotiationStatus.state} to dspace:ACCEPTED`)
    }
    if (negotiationStatus.state !== ContractNegotiationState.VERIFIED) {
      throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${negotiationStatus.state} to dspace:FINALIZED`)
    }
    negotiationStatus.state = ContractNegotiationState.FINALIZED;
    return {
      status: 'OK'
    }
  }

  async terminationCallback(processId: string, contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage): Promise<{status: string} | undefined> {
    const negotiationStatus = await this.getNegotiation(processId);
    if (negotiationStatus === undefined) {
      return undefined;
    }
    negotiationStatus.state = ContractNegotiationState.TERMINATED;
    negotiationStatus.termination = {
      code: contractNegotiationTerminationMessage.code,
      reason: contractNegotiationTerminationMessage.reason
    }
    return {
      status: 'OK'
    }
  }
}
