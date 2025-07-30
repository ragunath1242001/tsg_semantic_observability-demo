import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmEventDto,
  CreateAlgorithmEventDto,
  CreateInternalEventDto,
  InternalEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { parseNetworkError } from "@tsg-dsp/common-api";
import axios from "axios";
import crypto from "crypto";
import { Repository } from "typeorm";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { ManagementClient } from "../dataplane/management-client.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { TransfersService } from "../dataplane/transfers.service.js";
import { getAxiosConfigFromDataAddress } from "../utils/axios.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { parseToken } from "../utils/token.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { InternalEventDao } from "./internal-event.dao.js";

@Injectable()
export class EventsService {
  constructor(
    private readonly transfersService: TransfersService,
    private readonly managementClient: ManagementClient,
    private readonly algorithmInstancesService: AlgorithmInstancesService,
    @InjectRepository(AlgorithmEventDao)
    private readonly algorithmEventsRepository: Repository<AlgorithmEventDao>,
    @InjectRepository(InternalEventDao)
    private readonly internalEventsRepository: Repository<InternalEventDao>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createInternalEvent({
    algorithmInstanceId,
    createInternalEvent: createInternalEvent
  }: {
    algorithmInstanceId: string;
    createInternalEvent: CreateInternalEventDto;
  }) {
    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );

    const event = this.internalEventsRepository.create({
      algorithmInstance,
      ...createInternalEvent
    });

    await this.internalEventsRepository.save(event);

    return event;
  }

  async createOwnAlgorithmEvent({
    algorithmInstance,
    createEvent
  }: {
    algorithmInstance: AlgorithmInstanceDao;
    createEvent: CreateAlgorithmEventDto;
  }) {
    this.logger.log(
      `Creating own event for algorithm instance ${algorithmInstance.id} with event ID ${createEvent.eventId}`
    );
    if (!createEvent.recipients || createEvent.recipients.length === 0) {
      throw new DataPlaneError(
        "Recipients must be specified for created algorithm events",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    const invalidRecipients = createEvent.recipients.filter(
      (recipient) =>
        !algorithmInstance.participants.some((p) => p.didId === recipient)
    );
    if (invalidRecipients.length > 0) {
      throw new DataPlaneError(
        `Invalid recipients: [${invalidRecipients.join(", ")}]. Valid participants are: [${algorithmInstance.participants.map((p) => p.didId).join(", ")}]`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    const ownParticipantId = await this.managementClient.getOwnParticipantId();

    const transferPromises = await Promise.allSettled(
      createEvent.recipients
        .filter((recipient) => recipient !== ownParticipantId)
        .map(async (recipient) => {
          const recipientDetail = algorithmInstance.participants.find(
            (p) => p.didId === recipient
          )!;
          const recipientTransfer = algorithmInstance.transfers.find(
            (transfer) =>
              transfer.remoteParty === recipient && transfer.role === "consumer"
          );
          if (!recipientTransfer) {
            const dataset =
              await this.managementClient.fetchDatasetForParticipant(
                recipientDetail,
                false
              );
            const transfer =
              await this.transfersService.requestTransferForParticipant(
                recipientDetail,
                dataset,
                algorithmInstance.id,
                true
              );
            await this.algorithmInstancesService.linkTransfer({
              algorithmInstanceId: algorithmInstance.id,
              transfer
            });
            return transfer;
          } else {
            return recipientTransfer;
          }
        })
    );

    if (transferPromises.some((result) => result.status === "rejected")) {
      throw new DataPlaneError(
        "Failed to obtain transfer for one or more recipients",
        HttpStatus.INTERNAL_SERVER_ERROR
      ).andLog(this.logger);
    }

    const transfers = transferPromises
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<TransferDao>).value);

    const forwardEventResults = await Promise.allSettled(
      transfers.map(async (transfer) => {
        this.logger.log(
          `Forwarding event ${createEvent.eventId} to transfer ${transfer.id}`
        );
        // Create forwarded event (not an own event for the recipient)
        const forwardedEventData: CreateAlgorithmEventDto = {
          ...createEvent,
          recipients: undefined
        };
        // Send event to recipient's analytics data plane
        await this.forwardEventToParticipant(
          transfer,
          algorithmInstance.id,
          forwardedEventData
        );
      })
    );
    if (forwardEventResults.some((result) => result.status === "rejected")) {
      forwardEventResults
        .filter((result) => result.status === "rejected")
        .forEach(() => {
          this.logger.error(`Failed to forward event ${createEvent.eventId}`);
        });
    } else {
      this.logger.log(
        `Successfully forwarded event ${createEvent.eventId} to all transfers`
      );
    }
    return transfers.map((transfer) => transfer.id);
  }

  async createRemoteAlgorithmEvent({
    algorithmInstance,
    createEvent,
    transfer
  }: {
    algorithmInstance: AlgorithmInstanceDao;
    createEvent: CreateAlgorithmEventDto;
    transfer: TransferDao;
  }) {
    this.logger.log(
      `Creating forwarded event for algorithm instance ${algorithmInstance.id} with event ID ${createEvent.eventId}`
    );

    if (!transfer.algorithmInstance) {
      await this.algorithmInstancesService.linkTransfer({
        algorithmInstanceId: algorithmInstance.id,
        transfer
      });
    } else if (
      !algorithmInstance.transfers.some(
        (t) => t.id === transfer.id && t.remoteParty === transfer.remoteParty
      )
    ) {
      throw new DataPlaneError(
        `Transfer ${transfer.id} does not belong to algorithm instance ${algorithmInstance.id}`,
        HttpStatus.FORBIDDEN
      ).andLog(this.logger);
    }
  }

  async createAlgorithmEvent({
    createEvent,
    algorithmInstanceId,
    authorizationHeader
  }: {
    createEvent: CreateAlgorithmEventDto;
    algorithmInstanceId: string;
    authorizationHeader?: string;
  }) {
    this.logger.log(
      `Creating algorithm event for instance ${algorithmInstanceId} with event ID ${createEvent.eventId}`
    );
    let createdBy: string;
    let isOwnEvent: boolean;
    let transferIds: string[] | undefined = undefined;
    const token = parseToken(authorizationHeader);

    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );

    if (
      this.algorithmInstancesService.isValidJobAccessToken(
        token,
        algorithmInstanceId
      )
    ) {
      transferIds = await this.createOwnAlgorithmEvent({
        algorithmInstance,
        createEvent
      });
      isOwnEvent = true;
      createdBy = await this.managementClient.getOwnParticipantId();
    } else {
      const transfer = await this.transfersService.getTransferBySecret(token);
      await this.createRemoteAlgorithmEvent({
        algorithmInstance,
        createEvent,
        transfer
      });
      isOwnEvent = false;
      createdBy = transfer.remoteParty;
    }
    return await this.algorithmEventsRepository.save({
      id: `urn:uuid:${crypto.randomUUID()}`,
      eventId: createEvent.eventId,
      algorithmInstance: algorithmInstance,
      name: createEvent.name,
      number: createEvent.number,
      timestamp: createEvent.timestamp,
      createdBy,
      isOwnEvent: isOwnEvent,
      transferIds: transferIds,
      recipients: createEvent.recipients
    });
  }

  async uploadAlgorithmEventData({
    algorithmInstanceId,
    eventId,
    eventData,
    authorizationHeader
  }: {
    algorithmInstanceId: string;
    eventId: string;
    eventData: Buffer;
    authorizationHeader?: string;
  }) {
    const token = parseToken(authorizationHeader);
    await this.algorithmInstancesService.validateAccessToken(
      algorithmInstanceId,
      token
    );

    const event = await this.getAlgorithmEvent(algorithmInstanceId, eventId);
    event.data = eventData;
    return await this.algorithmEventsRepository.save(event);
  }

  async getEventData({
    algorithmInstanceId,
    eventId,
    authorizationHeader
  }: {
    algorithmInstanceId: string;
    eventId: string;
    authorizationHeader?: string;
  }) {
    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );
    const event = await this.getAlgorithmEvent(algorithmInstanceId, eventId);

    const token = parseToken(authorizationHeader);

    if (event.isOwnEvent) {
      // If no transfer for secret, try internal events token
      await this.algorithmInstancesService.validateAccessToken(
        algorithmInstanceId,
        token
      );
      return event.data;
    } else {
      const transfer = await this.transfersService.getTransferBySecret(token);

      if (
        transfer &&
        algorithmInstance.transfers.some((t) => t.id === transfer.id)
      ) {
        return event.data;
      }
    }
  }

  async getAlgorithmEvent(analyisId: string, eventId: string) {
    const event = await this.algorithmEventsRepository.findOne({
      where: { eventId, algorithmInstance: { id: analyisId } }
    });

    if (!event) {
      throw new DataPlaneError(
        `Algorithm event with ID ${eventId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    return event;
  }

  async getEventsForAlgorithmInstance(algorithmInstanceId: string): Promise<{
    algorithmEvents: AlgorithmEventDto[];
    internalEvents: InternalEventDto[];
  }> {
    // Verify the algorithm instance exists
    await this.algorithmInstancesService.getAlgorithmInstance(
      algorithmInstanceId
    );

    // Get all algorithm events for the algorithm instance
    const algorithmEvents = await this.algorithmEventsRepository.find({
      where: { algorithmInstance: { id: algorithmInstanceId } },
      order: { timestamp: "ASC" }
    });

    // Get all internal events for the algorithm instance
    const internalEvents = await this.internalEventsRepository.find({
      where: { algorithmInstance: { id: algorithmInstanceId } },
      order: { timestamp: "ASC" }
    });

    return {
      algorithmEvents: algorithmEvents.map((event) => ({
        id: event.id,
        eventId: event.eventId,
        algorithmInstanceId: algorithmInstanceId,
        name: event.name,
        number: event.number,
        timestamp: event.timestamp,
        createdBy: event.createdBy,
        transferIds: event.transferIds,
        recipients: event.recipients
      })),
      internalEvents: internalEvents.map((event) => ({
        id: event.id,
        algorithmInstanceId: algorithmInstanceId,
        name: event.name,
        number: event.number,
        timestamp: event.timestamp
      }))
    };
  }

  /**
   * Forward an event to a specific participant via their transfer endpoint
   */
  async forwardEventToParticipant(
    transfer: TransferDao,
    algorithmInstanceId: string,
    createEvent: CreateAlgorithmEventDto
  ): Promise<void> {
    try {
      if (!transfer.dataAddress || !transfer.dataAddress.endpoint) {
        throw new Error(`No endpoint found for transfer ${transfer.id}`);
      }

      const targetEndpoint = `${transfer.dataAddress.endpoint}/events/${algorithmInstanceId}/algorithm-event`;

      this.logger.log(
        `Forwarding event ${createEvent.eventId} to ${transfer.remoteParty} at ${targetEndpoint}`
      );

      const response = await axios.post(
        targetEndpoint,
        createEvent,
        getAxiosConfigFromDataAddress(transfer)
      );

      this.logger.log(
        `Successfully forwarded event ${createEvent.eventId} to ${transfer.remoteParty}. Response status: ${response.status}`
      );
    } catch (error) {
      throw parseNetworkError(
        error,
        `forwarding event ${createEvent.eventId} to participant ${transfer.remoteParty}`
      ).andLog(this.logger);
    }
  }
}
