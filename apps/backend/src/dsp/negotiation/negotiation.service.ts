import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Multilanguage } from "../../model/dsp/common";
import {
  ContractAgreementMessage,
  ContractAgreementVerificationMessage,
  ContractNegotiation,
  ContractNegotiationEventMessage,
  ContractNegotiationTerminationMessage,
  ContractOfferMessage,
  ContractRequestMessage,
} from "../../model/dsp/negotiation/messages";
import { ContractNegotiationState, NegotiationEvent } from "@tsg-dsp/common";
import {
  Offer,
  Agreement,
  NegotiationDetail,
  NegotiationProcessEvent,
  NegotiationRole,
  NegotiationStatus,
} from "../../model/dsp/negotiation/negotiation";
import crypto from "crypto";
import { DspClientService } from "../client/client.service";
import { deserialize } from "../../model/serialize";
import {
  NegotiationDetailDao,
  NegotiationProcessEventDao,
} from "../../model/dsp/negotiation/negotiation.dao";
import { DSPError } from "../../utils/errors/error";
import { IamConfig, ServerConfig } from "../../config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NegotiationStatusDto } from "@libs/dtos";

@Injectable()
export class NegotiationService {
  constructor(
    private readonly dsp: DspClientService,
    private readonly server: ServerConfig,
    private readonly iam: IamConfig,
    @InjectRepository(NegotiationDetailDao)
    private readonly negotiationDetailRepository: Repository<NegotiationDetailDao>,
    @InjectRepository(NegotiationProcessEventDao)
    private readonly negotiationProcessEventRepository: Repository<NegotiationProcessEventDao>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private readonly providerTransitions: Record<
    ContractNegotiationState,
    ContractNegotiationState[]
  > = {
    [ContractNegotiationState.REQUESTED]: [
      ContractNegotiationState.OFFERED,
      ContractNegotiationState.AGREED,
      ContractNegotiationState.TERMINATED,
    ],
    [ContractNegotiationState.OFFERED]: [],
    [ContractNegotiationState.ACCEPTED]: [
      ContractNegotiationState.AGREED,
      ContractNegotiationState.TERMINATED,
    ],
    [ContractNegotiationState.AGREED]: [],
    [ContractNegotiationState.VERIFIED]: [
      ContractNegotiationState.FINALIZED,
      ContractNegotiationState.TERMINATED,
    ],
    [ContractNegotiationState.FINALIZED]: [],
    [ContractNegotiationState.TERMINATED]: [],
  };
  private readonly consumerTransitions: Record<
    ContractNegotiationState,
    ContractNegotiationState[]
  > = {
    [ContractNegotiationState.REQUESTED]: [ContractNegotiationState.TERMINATED],
    [ContractNegotiationState.OFFERED]: [
      ContractNegotiationState.REQUESTED,
      ContractNegotiationState.ACCEPTED,
      ContractNegotiationState.TERMINATED,
    ],
    [ContractNegotiationState.ACCEPTED]: [],
    [ContractNegotiationState.AGREED]: [
      ContractNegotiationState.VERIFIED,
      ContractNegotiationState.TERMINATED,
    ],
    [ContractNegotiationState.VERIFIED]: [],
    [ContractNegotiationState.FINALIZED]: [],
    [ContractNegotiationState.TERMINATED]: [],
  };

  private readonly allowedTransitions: Record<
    "remote" | "local",
    Record<
      NegotiationRole,
      Record<ContractNegotiationState, ContractNegotiationState[]>
    >
  > = {
    remote: {
      provider: this.consumerTransitions,
      consumer: this.providerTransitions,
    },
    local: {
      provider: this.providerTransitions,
      consumer: this.consumerTransitions,
    },
  };

  private async checkTransition(
    direction: "remote" | "local",
    negotiation: NegotiationDetail,
    to: ContractNegotiationState
  ) {
    if (
      !this.allowedTransitions[direction][negotiation.role][
        negotiation.state
      ].includes(to)
    ) {
      const event: NegotiationProcessEvent = {
        time: new Date(),
        state: to,
        localMessage: `Negotiation with process ID ${negotiation.localId} cannot transition from ${negotiation.state} to ${to}`,
        type: direction,
      };
      const eventObj = this.negotiationProcessEventRepository.create(event);
      negotiation.events.push(eventObj);
      await this.negotiationDetailRepository.save(negotiation);
      throw new DSPError(
        `Negotiation with process ID ${negotiation.localId} cannot transition from ${negotiation.state} to ${to}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async getNegotiations(): Promise<NegotiationStatusDto[]> {
    const negotiations = await this.negotiationDetailRepository.find({
      select: {
        localId: true,
        remoteId: true,
        role: true,
        remoteAddress: true,
        remoteParty: true,
        state: true,
        dataSet: true,
        modifiedDate: true,
      },
    });
    return negotiations;
  }

  async getNegotiation(
    processId: string,
    audience?: string
  ): Promise<NegotiationDetail> {
    const negotiation = await this.negotiationDetailRepository.findOneBy({
      localId: processId,
      remoteParty: audience,
    });
    if (negotiation) {
      return new NegotiationDetail(negotiation);
    } else {
      throw new DSPError(
        `Cannot get negotiation with process ID ${processId} for ${audience}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async requestNew(
    offer: Offer,
    dataSet: string,
    remoteAddress: string,
    audience: string
  ): Promise<NegotiationDetail> {
    const consumerPid = `urn:uuid:${crypto.randomUUID()}`;
    offer.target = dataSet;
    const contractRequestMessage = new ContractRequestMessage({
      consumerPid: consumerPid,
      offer: offer,
      callbackAddress: `${this.server.publicAddress}/negotiations/callbacks/${consumerPid}`,
    });

    const contractNegotiationResponse = await this.dsp.requestNegotiation(
      `${remoteAddress}/request`,
      contractRequestMessage,
      audience
    );
    const contractNegotiation = await deserialize<ContractNegotiation>(
      contractNegotiationResponse
    );

    const negotiation: NegotiationDetail = {
      localId: consumerPid,
      remoteId: contractNegotiation.providerPid,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${contractNegotiation.providerPid}`,
      remoteParty: audience,
      state: ContractNegotiationState.REQUESTED,
      dataSet: dataSet,
      offer: offer,
      events: [],
    };

    return this.createNegotiationDetail(negotiation, "local");
  }

  async createNegotiationDetail(
    negotiation: NegotiationDetail,
    type: "local" | "remote"
  ) {
    const event = this.negotiationProcessEventRepository.create({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
      type: type,
    });
    negotiation.events.push(event);
    await this.negotiationDetailRepository.save(negotiation);
    return negotiation;
  }

  async handleNewRequest(
    requestMessage: ContractRequestMessage,
    remoteParty: string
  ): Promise<ContractNegotiation> {
    const providerPid = `urn:uuid:${crypto.randomUUID()}`;
    const contractNegotiation = new ContractNegotiation({
      id: providerPid,
      consumerPid: requestMessage.consumerPid,
      providerPid: providerPid,
      state: ContractNegotiationState.REQUESTED,
    });

    if (requestMessage.offer.target === undefined) {
      throw new DSPError(
        "Target attribute in provided Offer must be set.",
        HttpStatus.BAD_REQUEST
      );
    }

    const negotiation: NegotiationDetail = {
      localId: providerPid,
      remoteId: requestMessage.consumerPid,
      role: "provider",
      remoteAddress: requestMessage.callbackAddress,
      remoteParty: remoteParty,
      state: ContractNegotiationState.REQUESTED,
      dataSet: requestMessage.offer.target,
      offer: requestMessage.offer,
      events: [],
    };
    await this.createNegotiationDetail(negotiation, "remote");
    return contractNegotiation;
  }

  async requestExisting(
    offer: Offer,
    processId: string
  ): Promise<NegotiationDetail> {
    const negotiation = await this.getNegotiation(processId);
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.REQUESTED
    );
    offer.target = negotiation.dataSet;
    const contractRequestMessage = new ContractRequestMessage({
      providerPid: negotiation.remoteId,
      consumerPid: negotiation.localId,
      offer: offer,
      callbackAddress: `${this.server.publicAddress}/negotiations/callbacks/${processId}`,
    });
    const contractNegotiationResponse = await this.dsp.requestNegotiation(
      `${negotiation.remoteAddress}/request`,
      contractRequestMessage,
      negotiation.remoteParty
    );

    await deserialize<ContractNegotiation>(contractNegotiationResponse);
    negotiation.state = ContractNegotiationState.REQUESTED;
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
      type: "local",
    });
    negotiation.offer = offer;
    await this.negotiationDetailRepository.save(negotiation);
    return negotiation;
  }

  async handleExistingRequest(
    processId: string,
    requestMessage: ContractRequestMessage,
    audience: string
  ) {
    if (processId !== requestMessage.providerPid) {
      throw new DSPError(
        `Contract negotiation process ID mismatch ${processId} vs ${requestMessage.providerPid}`,
        HttpStatus.BAD_REQUEST
      );
    }
    const negotiation = await this.getNegotiation(processId, audience);
    await this.checkTransition(
      "remote",
      negotiation,
      ContractNegotiationState.REQUESTED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.REQUESTED,
      type: "remote",
    });
    negotiation.state = ContractNegotiationState.REQUESTED;
    negotiation.offer = requestMessage.offer;
    await this.negotiationDetailRepository.save(negotiation);
    return new ContractNegotiation({
      providerPid: negotiation.localId,
      consumerPid: negotiation.remoteId,
      state: negotiation.state,
    });
  }

  async offer(
    offer: Offer,
    processId: string,
    address?: string
  ): Promise<{ status: string }> {
    // TODO: Allow provider initiated negotiations
    const negotiation = await this.getNegotiation(processId);
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.OFFERED
    );
    const contractOfferMessage = new ContractOfferMessage({
      providerPid: negotiation.localId,
      consumerPid: negotiation.remoteId,
      offer: offer,
      callbackAddress: `${this.server.publicAddress}/negotiations/${negotiation.localId}`,
    });
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.OFFERED,
      type: "local",
    });

    await this.dsp.negotiationOffer(
      `${negotiation.remoteAddress}/offers`,
      contractOfferMessage,
      negotiation.remoteParty
    );
    negotiation.offer = contractOfferMessage.offer;
    negotiation.state = ContractNegotiationState.OFFERED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async handleOffer(
    processId: string,
    contractOfferMessage: ContractOfferMessage,
    audience: string
  ): Promise<{ status: string }> {
    // TODO: Allow provider initiated negotiations
    const negotiation = await this.getNegotiation(processId, audience);
    await this.checkTransition(
      "remote",
      negotiation,
      ContractNegotiationState.OFFERED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.OFFERED,
      type: "remote",
    });
    negotiation.offer = contractOfferMessage.offer;
    negotiation.state = ContractNegotiationState.OFFERED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async accept(processId: string): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId);
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.ACCEPTED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.ACCEPTED,
      type: "local",
    });
    const eventMessage = new ContractNegotiationEventMessage({
      providerPid: negotiation.remoteId,
      consumerPid: negotiation.localId,
      eventType: NegotiationEvent.ACCEPTED,
    });
    await this.dsp.negotiationEvent(
      `${negotiation.remoteAddress}/events`,
      eventMessage,
      negotiation.remoteParty
    );
    negotiation.state = ContractNegotiationState.ACCEPTED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async handleEvent(
    processId: string,
    contractNegotiationEventMessage: ContractNegotiationEventMessage,
    audience: string
  ): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId, audience);
    const newState =
      contractNegotiationEventMessage.eventType === NegotiationEvent.ACCEPTED
        ? ContractNegotiationState.ACCEPTED
        : ContractNegotiationState.FINALIZED;

    await this.checkTransition("remote", negotiation, newState);
    negotiation.events.push({
      time: new Date(),
      state: newState,
      type: "remote",
    });
    negotiation.state = newState;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async agree(processId: string): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId);
    if (negotiation.offer === undefined) {
      throw new DSPError(
        `No offer present for negotiation ${processId}, no agreement can be created`,
        HttpStatus.BAD_REQUEST
      );
    }
    if (negotiation.offer.target === undefined) {
      throw new DSPError(
        `No agreement target available`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.AGREED
    );
    const agreement = new Agreement({
      ...negotiation.offer,
      target: negotiation.offer.target,
      timestamp: new Date().toISOString(),
      assignee: negotiation.remoteParty,
      assigner: this.iam.didId,
    });
    const agreementMessage = new ContractAgreementMessage({
      providerPid: negotiation.localId,
      consumerPid: negotiation.remoteId,
      agreement: agreement,
    });
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.AGREED,
      agreementMessage: JSON.stringify(await agreementMessage.serialize()),
      type: "local",
    });
    await this.dsp.negotiationAgreement(
      `${negotiation.remoteAddress}/agreement`,
      agreementMessage,
      negotiation.remoteParty
    );
    negotiation.state = ContractNegotiationState.AGREED;
    negotiation.agreement = agreement;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async handleAgreement(
    processId: string,
    contractAgreementMessage: ContractAgreementMessage,
    audience: string
  ): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId, audience);
    await this.checkTransition(
      "remote",
      negotiation,
      ContractNegotiationState.AGREED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.AGREED,
      agreementMessage: JSON.stringify(
        await contractAgreementMessage.serialize()
      ),
      type: "remote",
    });
    negotiation.agreement = contractAgreementMessage.agreement;
    negotiation.state = ContractNegotiationState.AGREED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async verify(processId: string): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId);
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.VERIFIED
    );
    const contractAgreementMessage = negotiation.events.find(
      (e) => e.agreementMessage !== undefined
    );
    if (contractAgreementMessage === undefined) {
      throw new DSPError(
        `No agreement message present that can be signed for verification`,
        HttpStatus.BAD_REQUEST
      );
    }
    const contractAgreementVerificationMessage =
      new ContractAgreementVerificationMessage({
        providerPid: negotiation.remoteId,
        consumerPid: negotiation.localId,
        hashedMessage: {
          "dspace:algorithm": "sha256",
          "dspace:digest": this.createHash(""),
        },
      });
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.VERIFIED,
      verification: contractAgreementVerificationMessage,
      type: "local",
    });
    await this.dsp.negotiationVerification(
      `${negotiation.remoteAddress}/agreement/verification`,
      contractAgreementVerificationMessage,
      negotiation.remoteParty
    );
    negotiation.state = ContractNegotiationState.VERIFIED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async handleVerification(
    processId: string,
    contractAgreementVerificationMessage: ContractAgreementVerificationMessage,
    audience: string
  ): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId, audience);
    await this.checkTransition(
      "remote",
      negotiation,
      ContractNegotiationState.VERIFIED
    );
    // TODO: Verify proofs
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.VERIFIED,
      verification: contractAgreementVerificationMessage,
      type: "remote",
    });
    negotiation.state = ContractNegotiationState.VERIFIED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async finalize(processId: string): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId);
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.FINALIZED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.FINALIZED,
      type: "local",
    });
    const eventMessage = new ContractNegotiationEventMessage({
      providerPid: negotiation.localId,
      consumerPid: negotiation.remoteId,
      eventType: NegotiationEvent.FINALIZED,
    });
    await this.dsp.negotiationEvent(
      `${negotiation.remoteAddress}/events`,
      eventMessage,
      negotiation.remoteParty
    );
    negotiation.state = ContractNegotiationState.FINALIZED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async terminate(
    processId: string,
    code?: string,
    reason?: string
  ): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId);
    await this.checkTransition(
      "local",
      negotiation,
      ContractNegotiationState.TERMINATED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.TERMINATED,
      code: code,
      reason: reason ? [new Multilanguage(reason)] : undefined,
      type: "local",
    });
    negotiation.state = ContractNegotiationState.TERMINATED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  async handleTermination(
    processId: string,
    contractNegotiationTerminationMessage: ContractNegotiationTerminationMessage,
    audience: string
  ): Promise<{ status: string }> {
    const negotiation = await this.getNegotiation(processId, audience);
    await this.checkTransition(
      "remote",
      negotiation,
      ContractNegotiationState.TERMINATED
    );
    negotiation.events.push({
      time: new Date(),
      state: ContractNegotiationState.TERMINATED,
      code: contractNegotiationTerminationMessage.code,
      reason: contractNegotiationTerminationMessage.reason,
      type: "remote",
    });
    negotiation.state = ContractNegotiationState.TERMINATED;
    await this.negotiationDetailRepository.save(negotiation);
    return {
      status: "OK",
    };
  }

  private createHash(message: string): string {
    const hash = crypto.createHash("sha256");
    hash.update(message);
    return hash.digest().toString();
  }
}
