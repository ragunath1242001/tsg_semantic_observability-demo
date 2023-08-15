import { Injectable } from "@nestjs/common";
import { Multilanguage } from "../../model/dsp/common";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage, IContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { ContractNegotiationState, NegotiationEvent } from "../../model/dsp/negotiation/messages.dto";
import { Offer, Agreement } from "../../model/dsp/negotiation/negotiation";
import crypto from "crypto";

type NegotiationRole = "provider" | "consumer";

interface NegotiationProcessEvent {
  time: Date,
  state: ContractNegotiationState,
  localMessage?: string,
  code?: string,
  reason?: Multilanguage[],
  verification?: ContractAgreementVerificationMessage
}

interface NegotiationStatus {
  localId: string,
  remoteId?: string,
  role: NegotiationRole,
  remoteAddress: string,
  state: ContractNegotiationState,
  offer?: Offer,
  agreement?: Agreement,
  localEvents: NegotiationProcessEvent[],
  remoteEvents: NegotiationProcessEvent[],
}

@Injectable()
export class NegotiationService {
  private readonly negotiations: NegotiationStatus[] = [];

  private readonly providerTransitions: Record<ContractNegotiationState, ContractNegotiationState[]> = {
    [ContractNegotiationState.REQUESTED]: [ContractNegotiationState.OFFERED, ContractNegotiationState.AGREED, ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.OFFERED]: [],
    [ContractNegotiationState.ACCEPTED]: [ContractNegotiationState.AGREED, ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.AGREED]: [],
    [ContractNegotiationState.VERIFIED]: [ContractNegotiationState.FINALIZED, ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.FINALIZED]: [],
    [ContractNegotiationState.TERMINATED]: []
  }
  private readonly consumerTransitions: Record<ContractNegotiationState, ContractNegotiationState[]> = {
    [ContractNegotiationState.REQUESTED]: [ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.OFFERED]: [ContractNegotiationState.REQUESTED, ContractNegotiationState.ACCEPTED, ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.ACCEPTED]: [],
    [ContractNegotiationState.AGREED]: [ContractNegotiationState.VERIFIED, ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.VERIFIED]: [],
    [ContractNegotiationState.FINALIZED]: [],
    [ContractNegotiationState.TERMINATED]: []
  }

  private readonly allowedTransitions: Record<"remote" | "local", Record<NegotiationRole, Record<ContractNegotiationState, ContractNegotiationState[]>>> = {
    remote: {
      provider: this.consumerTransitions,
      consumer: this.providerTransitions
    },
    local: {
      provider: this.providerTransitions,
      consumer: this.consumerTransitions
    }
  }

  private checkTransition(direction: "remote" | "local", negotiation: NegotiationStatus, to: ContractNegotiationState) {
    if (!this.allowedTransitions[direction][negotiation.role][negotiation.state].includes(to)) {
      const event: NegotiationProcessEvent = {
        time: new Date(),
        state: to,
        localMessage: `Negotiation with process ID ${negotiation.localId} cannot transition from ${negotiation.state} to ${to}`
      }
      if (direction === "remote") {
        negotiation.remoteEvents.push(event);
      } else {
        negotiation.localEvents.push(event);
      }
      throw Error(`Negotiation with process ID ${negotiation.localId} cannot transition from ${negotiation.state} to ${to}`);
    }
  }

  async getNegotiation(processId: string): Promise<NegotiationStatus | undefined> {
    return this.negotiations.find(negotiation => negotiation.localId === processId);
  } 

  async request(offer: Offer, remoteAddress: string): Promise<ContractRequestMessage> {
    const processId = `urn:uuid:${crypto.randomUUID()}`;
    if (await this.getNegotiation(processId)) {
      throw Error(`Contract negotiation with process ID ${processId} already exists`);
    }
    const contractRequestMessage = new ContractRequestMessage({
      processId: processId,
      offer: offer,
      callbackAddress: `http://localhost/negotiation/callback/${processId}`
    })
    this.negotiations.push({
      localId: processId,
      role: "consumer",
      remoteAddress: remoteAddress,
      state: ContractNegotiationState.REQUESTED,
      offer: offer,
      localEvents: [{
        time: new Date(),
        state: ContractNegotiationState.REQUESTED
      }],
      remoteEvents: []
    });
    return contractRequestMessage;
  }

  async handleRequest(requestMessage: ContractRequestMessage): Promise<ContractNegotiation> {
    if (requestMessage.processId !== undefined) {
      throw Error(`Contract negotiation with process ID must be sent to the correct endpoint`);
    }
    const processId = `urn:uuid:${crypto.randomUUID()}`;
    if (await this.getNegotiation(processId)) {
      throw Error(
        `Contract negotiation with process ID ${processId} already exists`
      );
    }
    const contractNegotiation = new ContractNegotiation({
      id: processId,
      processId: processId,
      contractNegotiationState: ContractNegotiationState.REQUESTED,
    });
    this.negotiations.push({
      localId: processId,
      role: "provider",
      remoteAddress: requestMessage.callbackAddress,
      state: ContractNegotiationState.REQUESTED,
      offer: requestMessage.offer,
      localEvents: [],
      remoteEvents: [{
        time: new Date(),
        state: ContractNegotiationState.REQUESTED
      }],
    });
    return contractNegotiation;
  }

  async handleExistingRequest(processId: string, requestMessage: ContractRequestMessage) {
    const negotiation = await this.getNegotiation(processId);
    if (processId !== requestMessage.processId) {
      throw Error(`Contract negotiation process ID mismatch ${processId} vs ${requestMessage.processId}`)
    }
    if (negotiation === undefined) {
      throw Error(`Contract negotiation with process ID ${requestMessage.processId} not found`);
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.REQUESTED);
    negotiation.remoteEvents.push({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
    });
    negotiation.state = ContractNegotiationState.REQUESTED;
    negotiation.offer = requestMessage.offer;
    return new ContractNegotiation({
      processId: negotiation.localId,
      contractNegotiationState: negotiation.state,
    });
  }

  async offer(processId: string, contractOfferMessage: ContractOfferMessage): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      // TODO: Allow provider initiated negotiations
      return undefined;
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.OFFERED);
    negotiation.localEvents.push({
      time: new Date(),
      state: ContractNegotiationState.OFFERED,
    });
    negotiation.offer = contractOfferMessage.offer;
    negotiation.state = ContractNegotiationState.OFFERED;
    return {
      status: 'OK'
    }
  }

  async handleOffer(processId: string, contractOfferMessage: ContractOfferMessage): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      // TODO: Allow provider initiated negotiations
      return undefined;
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.OFFERED);
    negotiation.remoteEvents.push({
      time: new Date(),
      state: ContractNegotiationState.OFFERED,
    });
    negotiation.offer = contractOfferMessage.offer;
    negotiation.state = ContractNegotiationState.OFFERED;
    return {
      status: 'OK'
    }
  }

  async accept(processId: string): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.ACCEPTED);
    negotiation.localEvents.push({
      time: new Date(),
      state: ContractNegotiationState.ACCEPTED,
    });
    negotiation.state = ContractNegotiationState.ACCEPTED;
    return {
      status: 'OK'
    }
  }

  async handleEvent(processId: string, contractNegotiationEventMessage: ContractNegotiationEventMessage): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    const newState = (contractNegotiationEventMessage.eventType === NegotiationEvent.ACCEPTED) ? ContractNegotiationState.ACCEPTED : ContractNegotiationState.FINALIZED;

    this.checkTransition("remote", negotiation, newState);
    negotiation.remoteEvents.push({
      time: new Date(),
      state: newState
    });
    negotiation.state = newState;
    return {
      status: 'OK'
    }
  }

  async agree(processId: string, agreement: Agreement): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.AGREED);
    negotiation.localEvents.push({
      time: new Date(),
      state: ContractNegotiationState.AGREED,
    });
    negotiation.state = ContractNegotiationState.AGREED;
    negotiation.agreement = agreement
    return {
      status: 'OK'
    }
  }

  async handleAgreement(processId: string, contractAgreementMessage: ContractAgreementMessage): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.AGREED);
    negotiation.remoteEvents.push({
      time: new Date(),
      state: ContractNegotiationState.AGREED
    });
    negotiation.agreement = contractAgreementMessage.agreement;
    negotiation.state = ContractNegotiationState.VERIFIED;
    return {
      status: 'OK'
    }
  }

  async verify(processId: string, contractAgreementVerificationMessage: ContractAgreementVerificationMessage): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.VERIFIED);
    negotiation.localEvents.push({
      time: new Date(),
      state: ContractNegotiationState.VERIFIED,
      verification: contractAgreementVerificationMessage
    });
    negotiation.state = ContractNegotiationState.VERIFIED;
    return {
      status: 'OK'
    }
  }

  async handleVerification(processId: string, contractAgreementVerificationMessage: ContractAgreementVerificationMessage): Promise<{ status: string } | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.VERIFIED);
    // TODO: Verify proofs
    negotiation.remoteEvents.push({
      time: new Date(),
      state: ContractNegotiationState.VERIFIED,
      verification: contractAgreementVerificationMessage
    });
    negotiation.state = ContractNegotiationState.VERIFIED;

    return {
      status: "OK",
    };
  }

  async finalize(processId: string): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.FINALIZED);
    negotiation.localEvents.push({
      time: new Date(),
      state: ContractNegotiationState.FINALIZED,
    });
    negotiation.state = ContractNegotiationState.FINALIZED;
    return {
      status: 'OK'
    }
  }

  async terminate(processId: string, code?: string, reason?: Multilanguage[]): Promise<{status: string} | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.TERMINATED);
    negotiation.localEvents.push({
      time: new Date(),
      state: ContractNegotiationState.TERMINATED,
      code: code,
      reason: reason
    });
    negotiation.state = ContractNegotiationState.TERMINATED;
    return {
      status: 'OK'
    }
  }

  async handleTermination(processId: string, contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage): Promise<{ status: string } | undefined> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      return undefined;
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.TERMINATED);
    // TODO: Verify proofs
    negotiation.remoteEvents.push({
      time: new Date(),
      state: ContractNegotiationState.TERMINATED,
      code: contractNegotiationTerminationMessage.code,
      reason: contractNegotiationTerminationMessage.reason
    });
    negotiation.state = ContractNegotiationState.TERMINATED;

    return {
      status: "OK",
    };
  }

}