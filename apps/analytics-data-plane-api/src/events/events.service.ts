import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmEventDto,
  CreateAlgorithmEventDto,
  CreateInternalEventDto,
  InternalEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import crypto from "crypto";
import { Repository } from "typeorm";

import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { InternalEventDao } from "./internal-event.dao.js";

@Injectable()
export class EventsService {
  constructor(
    private readonly dataPlaneService: DataPlaneService,
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

  async createAlgorithmEvent({
    createEvent,
    algorithmInstanceId,
    authorizationHeader
  }: {
    createEvent: CreateAlgorithmEventDto;
    algorithmInstanceId: string;
    authorizationHeader: string;
  }) {
    let createdBy: string;
    let transferId: string | undefined;
    let isOwnEvent: boolean;

    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );
    const token = this.parseToken(authorizationHeader);

    // Determine if this is an own event based on token type
    try {
      // Try to verify as algorithm instance token first (own event)
      await this.algorithmInstancesService.verifyAlgorithmInstanceToken(
        algorithmInstanceId,
        token
      );
      isOwnEvent = true;
      createdBy = await this.dataPlaneService.getParticipantId();
    } catch (_algorithmInstanceTokenError) {
      try {
        // If algorithm instance token fails, try transfer token (remote event)
        const transfer = await this.dataPlaneService.getTransferBySecret(token);
        isOwnEvent = false;
        createdBy = transfer.remoteParty;
        transferId = transfer.id;
      } catch (_transferTokenError) {
        throw new DataPlaneError(
          "Invalid authorization token - not a valid algorithm instance token or transfer token",
          HttpStatus.UNAUTHORIZED
        ).andLog(this.logger);
      }
    }

    // Validate recipients early if this is an own event
    if (
      isOwnEvent &&
      createEvent.recipients &&
      createEvent.recipients.length > 0
    ) {
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
    }

    // Store the event
    const existingEventNumber = await this.algorithmEventsRepository.findOne({
      where: { number: createEvent.number }
    });
    if (existingEventNumber) {
      throw new DataPlaneError(
        `Event with Number ${createEvent.number} already exists`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const event = this.algorithmEventsRepository.create({
      id: `urn:uuid:${crypto.randomUUID()}`,
      eventId: createEvent.eventId,
      algorithmInstance: algorithmInstance,
      name: createEvent.name,
      number: createEvent.number,
      timestamp: createEvent.timestamp,
      createdBy,
      isOwnEvent: isOwnEvent,
      transferId: transferId,
      recipients: createEvent.recipients
    });

    const savedEvent = await this.algorithmEventsRepository.save(event);

    // Forward event to specified recipients if this is an own event
    if (
      isOwnEvent &&
      createEvent.recipients &&
      createEvent.recipients.length > 0
    ) {
      await this.forwardEventToParticipants(
        savedEvent,
        createEvent.recipients,
        authorizationHeader
      );
    }

    return savedEvent;
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
    authorizationHeader: string;
  }) {
    const token = this.parseToken(authorizationHeader);
    await this.algorithmInstancesService.verifyAlgorithmInstanceToken(
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
    authorizationHeader: string;
  }) {
    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );
    const event = await this.getAlgorithmEvent(algorithmInstanceId, eventId);

    const token = this.parseToken(authorizationHeader);

    if (event.isOwnEvent) {
      // If no transfer for secret, try internal events token
      await this.algorithmInstancesService.verifyAlgorithmInstanceToken(
        algorithmInstanceId,
        token
      );
      return event.data;
    } else {
      const transfer = await this.dataPlaneService.getTransferBySecret(token);

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
        transferId: event.transferId,
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
   * Forward an algorithm event to specified participants
   */
  private async forwardEventToParticipants(
    event: AlgorithmEventDao,
    recipients: string[],
    authorizationHeader: string
  ): Promise<void> {
    this.logger.log(
      `Forwarding event ${event.eventId} to ${recipients.length} recipients: ${recipients.join(", ")}`
    );

    // Forward event to each recipient
    const forwardingPromises = recipients.map(async (recipientId) => {
      try {
        // Find transfer for this specific recipient
        const recipientTransfer =
          await this.dataPlaneService.getTransferByAlgorithmInstanceAndParty(
            event.algorithmInstance.id,
            recipientId
          );

        if (!recipientTransfer) {
          this.logger.error(
            `No transfer found for recipient ${recipientId} in algorithm instance ${event.algorithmInstance.id}`
          );
          return;
        }

        // Create forwarded event (not an own event for the recipient)
        const forwardedEventData = {
          eventId: event.eventId,
          name: event.name,
          number: event.number,
          timestamp:
            event.timestamp instanceof Date
              ? event.timestamp.toISOString()
              : event.timestamp
        };

        // Send event to recipient's analytics data plane
        await this.dataPlaneService.forwardEventToParticipant(
          recipientTransfer,
          event.algorithmInstance.id,
          forwardedEventData,
          authorizationHeader
        );

        this.logger.log(
          `Successfully forwarded event ${event.eventId} to recipient ${recipientId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to forward event ${event.eventId} to recipient ${recipientId}: ${error}`
        );
        // Continue with other recipients even if one fails
      }
    });

    // Wait for all forwarding attempts to complete
    await Promise.allSettled(forwardingPromises);
  }

  private parseToken(authorizationHeader: string): string {
    const tokenFromHeader = authorizationHeader.split(" ")[1];

    if (tokenFromHeader === undefined) {
      throw new DataPlaneError("Invalid token", HttpStatus.UNAUTHORIZED).andLog(
        this.logger
      );
    }

    return tokenFromHeader;
  }
}
