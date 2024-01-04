import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Multilanguage } from "../../model/dsp/common";
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "../../model/dsp/negotiation/messages";
import { ContractNegotiationState, NegotiationEvent, ProofTypes } from "../../model/dsp/negotiation/messages.dto";
import { Offer, Agreement, NegotiationDetail, NegotiationProcessEvent, NegotiationRole, NegotiationStatus } from "../../model/dsp/negotiation/negotiation";
import crypto from "crypto";
import { DspClientService } from "../client/client.service";
import { deserialize } from "../../model/serialize";
import { NegotiationDetailDao, NegotiationProcessEventDao } from "../../model/dsp/negotiation/negotiation.dao"
import { DSPError } from "../../utils/errors/error";
import { IamConfig, ServerConfig } from "../../config";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";


@Injectable()
export class NegotiationService {
  constructor(
    private readonly dsp: DspClientService, 
    private readonly server: ServerConfig, 
    private readonly iam: IamConfig,
    @InjectRepository(NegotiationDetailDao) private readonly negotiationDetailRepository: Repository<NegotiationDetailDao>,
    @InjectRepository(NegotiationProcessEventDao) private readonly negotiationProcessEventRepository: Repository<NegotiationProcessEventDao>) {}
  private readonly logger = new Logger(this.constructor.name);

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

  private async checkTransition(direction: "remote" | "local", negotiation: NegotiationDetail, to: ContractNegotiationState) {
    if (!this.allowedTransitions[direction][negotiation.role][negotiation.state].includes(to)) {
      const event: NegotiationProcessEvent = {
        time: new Date(),
        state: to,
        localMessage: `Negotiation with process ID ${negotiation.localId} cannot transition from ${negotiation.state} to ${to}`,
        type: direction
      }
      const eventObj = this.negotiationProcessEventRepository.create(event)
      negotiation.events.push(eventObj)
      await this.negotiationDetailRepository.save(negotiation)
      throw new DSPError(`Negotiation with process ID ${negotiation.localId} cannot transition from ${negotiation.state} to ${to}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getNegotiations(): Promise<NegotiationStatus[]> {
    const negotiations = await this.negotiationDetailRepository.find({})
    return negotiations.map(negotiation => {
      return {
        localId: negotiation.localId,
        remoteId: negotiation.remoteId,
        role: negotiation.role,
        remoteAddress: negotiation.remoteAddress,
        remoteParty: negotiation.remoteParty,
        state: negotiation.state,
        dataSet: negotiation.dataSet
      }
    });
  }

  async getNegotiationWithOptions(processId: string, options: FindOptionsWhere<NegotiationDetailDao> | FindOptionsWhere<NegotiationDetailDao>[]): Promise<NegotiationDetail> {
    const negotiation = await this.negotiationDetailRepository.findOneBy(options)
      if (negotiation) {
        return new NegotiationDetail(negotiation);
      } else {
        throw new DSPError(`Cannot get negotiation with process ID ${processId}`, HttpStatus.NOT_FOUND)
      }
  }

  async getNegotiation(processId: string, audience?: string): Promise<NegotiationDetail> {
    if (audience) {
      return this.getNegotiationWithOptions(processId, {localId: processId, remoteParty: audience})
    } else {
      return this.getNegotiationWithOptions(processId, {localId: processId})
    }
  } 

  async requestNew(offer: Offer, dataSet: string, remoteAddress: string, audience: string): Promise<NegotiationDetail> {
    const processId = `urn:uuid:${crypto.randomUUID()}`;
    if (await this.getNegotiation(processId)) {
      throw new DSPError(`Contract negotiation with process ID ${processId} already exists`, HttpStatus.CONFLICT);
    }
    const contractRequestMessage = new ContractRequestMessage({
      processId: processId,
      offer: offer,
      callbackAddress: `${this.server.publicAddress}/negotiation/callbacks/${processId}`,
      dataSet: dataSet
    });

    const contractNegotiationResponse = await this.dsp.requestNegotiation(`${remoteAddress}/request`, contractRequestMessage, audience);
    const contractNegotiation = await deserialize<ContractNegotiation>(contractNegotiationResponse);

    const negotiation: NegotiationDetail = {
      localId: processId,
      remoteId: contractNegotiation.processId,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${contractNegotiation.processId}`,
      remoteParty: audience,
      state: ContractNegotiationState.REQUESTED,
      dataSet: dataSet,
      offer: offer,
      events: []
    }

    return this.createNegotiationDetail(negotiation, "local")
  }

  async createNegotiationDetail(negotiation: NegotiationDetail, type: "local" | "remote") {
    
    const event = this.negotiationProcessEventRepository.create({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
      type: type
    })
    negotiation.events.push(event)
    await this.negotiationDetailRepository.save(negotiation)
    return negotiation;
  }

  async handleNewRequest(requestMessage: ContractRequestMessage, remoteParty: string): Promise<ContractNegotiation> {
    const processId = `urn:uuid:${crypto.randomUUID()}`;
    if (await this.getNegotiation(processId)) {
      throw new DSPError(`Contract negotiation with process ID ${processId} already exists`, HttpStatus.CONFLICT);
    }
    const contractNegotiation = new ContractNegotiation({
      id: processId,
      processId: processId,
      contractNegotiationState: ContractNegotiationState.REQUESTED,
    });

    const negotiation: NegotiationDetail = {
      localId: processId,
      remoteId: requestMessage.processId,
      role: "provider",
      remoteAddress: requestMessage.callbackAddress,
      remoteParty: remoteParty,
      state: ContractNegotiationState.REQUESTED,
      dataSet: requestMessage.dataSet,
      offer: requestMessage.offer,
      events: []
    }
    await this.createNegotiationDetail(negotiation, "remote")
    return contractNegotiation;
  }

  async requestExisting(offer: Offer, processId: string): Promise<NegotiationDetail> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.REQUESTED);

    const contractRequestMessage = new ContractRequestMessage({
      processId: negotiation.remoteId,
      offer: offer,
      callbackAddress: `${this.server.publicAddress}/negotiation/callbacks/${processId}`,
      dataSet: negotiation.dataSet
    });
    const contractNegotiationResponse = await this.dsp.requestNegotiation(`${negotiation.remoteAddress}/request`, contractRequestMessage, negotiation.remoteParty);
    
    await deserialize<ContractNegotiation>(contractNegotiationResponse);

    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
      type: "local"
    });
    negotiation.offer = offer;
    await this.negotiationDetailRepository.save(negotiation)
    return negotiation;
  }

  async handleExistingRequest(processId: string, requestMessage: ContractRequestMessage, audience: string) {
    const negotiation = await this.getNegotiation(processId, audience);
    if (processId !== requestMessage.processId) {
      throw new DSPError(`Contract negotiation process ID mismatch ${processId} vs ${requestMessage.processId}`, HttpStatus.BAD_REQUEST);
    }
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.REQUESTED);
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
      type: "remote"
    });
    negotiation.state = ContractNegotiationState.REQUESTED;
    negotiation.offer = requestMessage.offer;
    await this.negotiationDetailRepository.save(negotiation)
    return new ContractNegotiation({
      processId: negotiation.localId,
      contractNegotiationState: negotiation.state,
    });
  }

  async offer(offer: Offer, processId: string, address?: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      // TODO: Allow provider initiated negotiations
      this.logger.log(`Initiating with an offer to ${address} not yet supported`);
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.OFFERED);
    const contractOfferMessage = new ContractOfferMessage({
      processId: negotiation.remoteId,
      offer: offer,
      callbackAddress: `${this.server.publicAddress}/negotiation/${negotiation.localId}`
    })
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.OFFERED,
      type: "local"
    });

    await this.dsp.negotiationOffer(`${negotiation.remoteAddress}/offers`, contractOfferMessage, negotiation.remoteParty);
    negotiation.offer = contractOfferMessage.offer;
    negotiation.state = ContractNegotiationState.OFFERED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async handleOffer(processId: string, contractOfferMessage: ContractOfferMessage, audience: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId, audience);
    if (negotiation === undefined) {
      // TODO: Allow provider initiated negotiations
      this.logger.log(`Initiating with an offer with id ${processId} not yet supported`);
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.OFFERED);
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.OFFERED,
      type: "remote"
    });
    negotiation.offer = contractOfferMessage.offer;
    negotiation.state = ContractNegotiationState.OFFERED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async accept(processId: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.ACCEPTED);
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.ACCEPTED,
      type: "local"
    });
    const eventMessage = new ContractNegotiationEventMessage({
      processId: negotiation.remoteId || "",
      eventType: NegotiationEvent.ACCEPTED
    })
    await this.dsp.negotiationEvent(`${negotiation.remoteAddress}/events`, eventMessage, negotiation.remoteParty);
    negotiation.state = ContractNegotiationState.ACCEPTED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async handleEvent(processId: string, contractNegotiationEventMessage: ContractNegotiationEventMessage, audience: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId, audience);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    const newState = (contractNegotiationEventMessage.eventType === NegotiationEvent.ACCEPTED) ? ContractNegotiationState.ACCEPTED : ContractNegotiationState.FINALIZED;

    this.checkTransition("remote", negotiation, newState);
    negotiation.events.push({
      time: new Date(),
      state: newState,
      type: "remote"
    });
    negotiation.state = newState;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async agree(processId: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    if (negotiation.offer === undefined) {
      throw new DSPError(`No offer present for negotiation ${processId}, no agreement can be created`, HttpStatus.BAD_REQUEST);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.AGREED);
    const agreement = new Agreement({
      ...negotiation.offer,
      timestamp: new Date().toISOString(),
      consumerId: negotiation.remoteParty,
      providerId: this.iam.didId,
      assignee: negotiation.offer?.assignee || negotiation.remoteParty,
      assigner: this.iam.didId
    });
    const agreementMessage = new ContractAgreementMessage({
      processId: negotiation.remoteId || "",
      agreement: agreement
    });
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.AGREED,
      agreementMessage: JSON.stringify(await agreementMessage.serialize()),
      type: "local"
    });
    await this.dsp.negotiationAgreement(`${negotiation.remoteAddress}/agreement`, agreementMessage, negotiation.remoteParty);
    negotiation.state = ContractNegotiationState.AGREED;
    negotiation.agreement = agreement
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async handleAgreement(processId: string, contractAgreementMessage: ContractAgreementMessage, audience: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId, audience);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.AGREED);
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.AGREED,
      agreementMessage: JSON.stringify(await contractAgreementMessage.serialize()),
      type: "remote"
    });
    negotiation.agreement = contractAgreementMessage.agreement;
    negotiation.state = ContractNegotiationState.AGREED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async verify(processId: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.VERIFIED);
    const contractAgreementMessage = negotiation.events.find(e => e.agreementMessage !== undefined);
    if (contractAgreementMessage === undefined) {
      throw new DSPError(`No agreement message present that can be signed for verification`, HttpStatus.BAD_REQUEST);
    }
    const contractAgreementVerificationMessage = new ContractAgreementVerificationMessage({
      processId: negotiation.remoteId,
      credentialSubject: {
        '@type': 'dspace:ContractAgreementMessageHash',
        'dspace:hash': this.createHash(contractAgreementMessage.agreementMessage || ''),
      },
      proof: {
        "@type": ProofTypes.Ed25519Signature2020,
        "dct:created": new Date().toISOString(),
        "sec:jws": "..."
      }
    });
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.VERIFIED,
      verification: contractAgreementVerificationMessage,
      type: "local"
    });
    await this.dsp.negotiationVerification(`${negotiation.remoteAddress}/agreement/verification`, contractAgreementVerificationMessage, negotiation.remoteParty);
    negotiation.state = ContractNegotiationState.VERIFIED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async handleVerification(processId: string, contractAgreementVerificationMessage: ContractAgreementVerificationMessage, audience: string): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId, audience);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.VERIFIED);
    // TODO: Verify proofs
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.VERIFIED,
      verification: contractAgreementVerificationMessage,
      type: "remote"
    });
    negotiation.state = ContractNegotiationState.VERIFIED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: "OK",
    };
  }

  async finalize(processId: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.FINALIZED);
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.FINALIZED,
      type: "local"
    });
    const eventMessage = new ContractNegotiationEventMessage({
      processId: negotiation.remoteId || "",
      eventType: NegotiationEvent.FINALIZED
    })
    await this.dsp.negotiationEvent(`${negotiation.remoteAddress}/events`, eventMessage, negotiation.remoteParty);
    negotiation.state = ContractNegotiationState.FINALIZED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async terminate(processId: string, code?: string, reason?: string): Promise<{status: string}> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", negotiation, ContractNegotiationState.TERMINATED);
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.TERMINATED,
      code: code,
      reason: (reason) ? [new Multilanguage(reason)] : undefined,
      type: "local"
    });
    negotiation.state = ContractNegotiationState.TERMINATED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: 'OK'
    }
  }

  async handleTermination(processId: string, contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage, audience: string): Promise<{ status: string } | undefined> {
    const negotiation = await this.getNegotiation(processId, audience);
    if (negotiation === undefined) {
      throw new DSPError(`Contract negotiation with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("remote", negotiation, ContractNegotiationState.TERMINATED);
    // TODO: Verify proofs
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.TERMINATED,
      code: contractNegotiationTerminationMessage.code,
      reason: contractNegotiationTerminationMessage.reason,
      type: "remote"
    });
    negotiation.state = ContractNegotiationState.TERMINATED;
    await this.negotiationDetailRepository.save(negotiation)
    return {
      status: "OK",
    };
  }

  private createHash(message: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(message);
    return hash.digest().toString();
  }

}