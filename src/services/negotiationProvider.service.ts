import { Injectable } from "@nestjs/common";
import {
  ContractAgreementVerificationMessage,
  ContractNegotiation,
  ContractNegotiationEventMessage,
  ContractNegotiationTerminationMessage,
  ContractRequestMessage,
} from "../model/dsp/negotiation/messages";
import {
  ContractNegotiationState,
  NegotiationEvent,
} from "../model/dsp/negotiation/messages.dto";
import { Agreement, Offer } from "../model/dsp/negotiation/negotiation";
import { Multilanguage } from "../model/dsp/common";

interface NegotiationProviderStatus {
    negotiation: ContractNegotiation,
    offer?: Offer,
    agreement?: Agreement,
    verification?: ContractAgreementVerificationMessage,
    termination?: {
      code?: string,
      reason: Multilanguage[]
    }
}

@Injectable()
export class NegotiationProviderService {
  private readonly contractNegotiations: NegotiationProviderStatus[] = [];

  async getNegotiationStatus(processId: string): Promise<NegotiationProviderStatus | undefined> {
    return this.contractNegotiations.find(
      (negotiationStatus) => negotiationStatus.negotiation.processId === processId
    );
  }

  async getNegotiation(
    processId: string
  ): Promise<ContractNegotiation | undefined> {
    return (await this.getNegotiationStatus(processId))?.negotiation;
  }

  async request(
    requestMessage: ContractRequestMessage
  ): Promise<ContractNegotiation> {
    const processId =
      requestMessage.processId ||
      "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085";
    if (await this.getNegotiationStatus(processId)) {
      throw Error(
        `Contract negotiation with process ID ${processId} already exists`
      );
    }
    const contractNegotiation = new ContractNegotiation({
      id: "urn:uuid:09b15239-8775-4de3-8441-c0d2b59cdf54",
      processId:
        requestMessage.processId ||
        "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
      contractNegotiationState: ContractNegotiationState.OFFERED,
    });
    this.contractNegotiations.push({
      negotiation: contractNegotiation,
      offer: requestMessage.offer
    });
    return contractNegotiation;
  }

  async negotiationEvent(
    processId: string,
    negotiationEventMessage: ContractNegotiationEventMessage
  ): Promise<{ status: string } | undefined> {
    const contractNegotiation = await this.getNegotiationStatus(processId);
    if (contractNegotiation === undefined) {
      return undefined;
    }

    switch (negotiationEventMessage.eventType) {
      case NegotiationEvent.ACCEPTED:
        if (contractNegotiation.negotiation.contractNegotiationState !== ContractNegotiationState.OFFERED) {
          throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${contractNegotiation.negotiation.contractNegotiationState} to dspace:ACCEPTED`);
        }

        contractNegotiation.negotiation.contractNegotiationState =
          ContractNegotiationState.ACCEPTED;
        contractNegotiation.agreement = new Agreement({
          ...contractNegotiation.offer,
          assigner: contractNegotiation.offer?.assigner || 'urn:participant:assigner',
          assignee: contractNegotiation.offer?.assigner || 'urn:participant:assignee',
          consumerId: 'urn:connector:consumer',
          providerId: 'urn:connector:provider',
          timestamp: new Date().toISOString()
        })
        break;
      case NegotiationEvent.FINALIZED:
        if (contractNegotiation.negotiation.contractNegotiationState !== ContractNegotiationState.VERIFIED) {
          throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${contractNegotiation.negotiation.contractNegotiationState} to dspace:FINALIZED`);
        }
        break;
    }

    return {
      status: "OK",
    };
  }

  async agreementVerification(
    processId: string,
    contractAgreementVerificationMessage: ContractAgreementVerificationMessage
  ): Promise<{ status: string } | undefined> {
    const contractNegotiation = await this.getNegotiationStatus(processId);
    if (contractNegotiation === undefined) {
      return undefined;
    }
    if (contractNegotiation.negotiation.contractNegotiationState !== ContractNegotiationState.ACCEPTED) {
      throw Error(`Contract negotiation with process ID ${processId} cannot transition from ${contractNegotiation.negotiation.contractNegotiationState} to dspace:VERIFIED`);
    }    

    // TODO: Verify proofs
    contractNegotiation.verification = contractAgreementVerificationMessage;
    contractNegotiation.negotiation.contractNegotiationState =
      ContractNegotiationState.VERIFIED;

    return {
      status: "OK",
    };
  }

  async negotiationTermination(
    processId: string,
    contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage
  ): Promise<{ status: string } | undefined> {
    const contractNegotiation = await this.getNegotiationStatus(processId);
    if (contractNegotiation === undefined) {
      return undefined;
    }

    contractNegotiation.termination = {
      code: contractNegotiationTerminationMessage.code,
      reason: contractNegotiationTerminationMessage.reason
    }
    contractNegotiation.negotiation.contractNegotiationState =
      ContractNegotiationState.TERMINATED;
    return {
      status: "OK",
    };
  }
}
