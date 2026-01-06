import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmEventDto,
  CreateAlgorithmEventDto,
  CreateInternalEventDto,
  InternalEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { parseNetworkError } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ITransferHandler,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import axios from "axios";
import crypto from "crypto";
import { MoreThan, Repository } from "typeorm";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { SplitModeService } from "../bridge/split-mode/split-mode.service.js";
import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { INTERNAL_EVENTS } from "../internal-events/internal-events.js";
import { getAxiosConfigFromDataAddress } from "../utils/axios.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { parseToken } from "../utils/token.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { InternalEventDao } from "./internal-event.dao.js";

@Injectable()
export class EventsService {
  constructor(
    private readonly catalog: CatalogClientService,
    private readonly transfer: TransferClientService,
    private readonly algorithmInstancesService: AlgorithmInstancesService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(AlgorithmEventDao)
    private readonly algorithmEventsRepository: Repository<AlgorithmEventDao>,
    @InjectRepository(InternalEventDao)
    private readonly internalEventsRepository: Repository<InternalEventDao>,
    private readonly splitMode: SplitModeService,
    private readonly bridgeWs: BridgeWsClientService,
    @Optional()
    @Inject(ITransferHandler)
    private readonly transferHandler?: AnalyticsTransferHandler
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

    return await this.internalEventsRepository.save(event);
  }

  async createOwnAlgorithmEvent({
    algorithmInstance,
    createEvent
  }: {
    algorithmInstance: AlgorithmInstanceDao;
    createEvent: CreateAlgorithmEventDto;
  }) {
    this.splitMode.requireTransferHandler(
      this.transferHandler,
      "Creating own algorithm events with forwarding"
    );
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
    const ownParticipantId = await this.catalog.getParticipantId();

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
            const dataset = await this.catalog.getDataset(
              recipientDetail.dataset,
              recipient
            );
            // Safe: requireTransferHandler above ensures transferHandler is defined
            const transfer =
              await this.transferHandler!.requestTransferForParticipant(
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
      // Job-originated events: in client mode we only persist locally (no transfer forwarding).
      if (this.splitMode.hasTransferCapability) {
        transferIds = await this.createOwnAlgorithmEvent({
          algorithmInstance,
          createEvent
        });
      }
      isOwnEvent = true;
      createdBy = await this.catalog.getParticipantId();
    } else {
      if (!this.transferHandler) {
        throw new DataPlaneError(
          "Transfer-based event creation is not available in this runtime mode",
          HttpStatus.NOT_IMPLEMENTED
        ).andLog(this.logger);
      }
      const transfer = await this.transferHandler.getTransferBySecret(token);
      await this.createRemoteAlgorithmEvent({
        algorithmInstance,
        createEvent,
        transfer
      });
      isOwnEvent = false;
      createdBy = transfer.remoteParty;
    }
    const savedEvent = await this.algorithmEventsRepository.save({
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

    if (
      this.splitMode.isClientMode &&
      this.algorithmInstancesService.isValidJobAccessToken(
        token,
        algorithmInstanceId
      )
    ) {
      // Wait for server acknowledgment before returning - this ensures the event
      // exists on the server before any subsequent data upload arrives
      await this.bridgeWs.emitAlgorithmEventCreate({
        algorithmInstanceId,
        event: createEvent
      });
    }

    if (!isOwnEvent) {
      this.eventEmitter.emit(`event.created.${algorithmInstanceId}`);

      // Emit internal event for bridge propagation to clients (server mode)
      if (this.splitMode.isServerMode) {
        this.eventEmitter.emit(INTERNAL_EVENTS.ALGORITHM_EVENTS_RECEIVED, {
          algorithmInstanceId,
          event: createEvent,
          createdBy,
          transferIds
        });
      }
    }

    return savedEvent;
  }

  async createAlgorithmEventFromBridge({
    algorithmInstanceId,
    createEvent
  }: {
    algorithmInstanceId: string;
    createEvent: CreateAlgorithmEventDto;
  }) {
    this.splitMode.requireTransferHandler(
      this.transferHandler,
      "Creating bridged algorithm events"
    );
    this.logger.log(
      `Creating bridged algorithm event for instance ${algorithmInstanceId} with event ID ${createEvent.eventId}`
    );
    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );

    const transferIds = await this.createOwnAlgorithmEvent({
      algorithmInstance,
      createEvent
    });

    const createdBy = await this.catalog.getParticipantId();
    return await this.algorithmEventsRepository.save({
      id: `urn:uuid:${crypto.randomUUID()}`,
      eventId: createEvent.eventId,
      algorithmInstance: algorithmInstance,
      name: createEvent.name,
      number: createEvent.number,
      timestamp: createEvent.timestamp,
      createdBy,
      isOwnEvent: true,
      transferIds,
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
    eventData?: Buffer;
    authorizationHeader?: string;
  }) {
    if (!eventData) {
      throw new DataPlaneError(
        `No data provided for algorithm event ${eventId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
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
      event.data = eventData;
      if (this.splitMode.hasTransferCapability) {
        await Promise.all(
          event.recipients?.map(async (recipient) => {
            const recipientTransfer = algorithmInstance.transfers.find(
              (transfer) =>
                transfer.remoteParty === recipient &&
                transfer.role === "consumer"
            );
            if (recipientTransfer) {
              await this.forwardEventDataToParticipant(
                recipientTransfer,
                algorithmInstanceId,
                eventId,
                eventData
              );
            }
          }) ?? []
        );
      }

      if (this.splitMode.isClientMode) {
        await this.bridgeWs.emitAlgorithmEventData({
          algorithmInstanceId,
          eventId,
          eventData
        });
      }
      await this.algorithmEventsRepository.save(event);
    } else {
      if (!this.transferHandler) {
        throw new DataPlaneError(
          "Transfer-based event data upload is not available in this runtime mode",
          HttpStatus.NOT_IMPLEMENTED
        ).andLog(this.logger);
      }
      const transfer = await this.transferHandler.getTransferBySecret(token);

      if (
        transfer &&
        algorithmInstance.transfers.some((t) => t.id === transfer.id)
      ) {
        const event = await this.getAlgorithmEvent(
          algorithmInstanceId,
          eventId
        );
        if (event.createdBy !== transfer.remoteParty) {
          throw new DataPlaneError(
            `Unauthorized access to algorithm event ${eventId}`,
            HttpStatus.FORBIDDEN
          ).andLog(this.logger);
        }
        event.data = eventData;
        await this.algorithmEventsRepository.save(event);

        // Emit internal event for bridge propagation to clients (server mode)
        if (this.splitMode.isServerMode) {
          this.eventEmitter.emit(
            INTERNAL_EVENTS.ALGORITHM_EVENT_DATA_RECEIVED,
            {
              algorithmInstanceId,
              eventId,
              eventData
            }
          );
        }
      } else {
        throw new DataPlaneError(
          `No transfer found or not linked to the algorithm instance`,
          HttpStatus.FORBIDDEN
        ).andLog(this.logger);
      }
    }
  }

  async uploadAlgorithmEventDataFromBridge({
    algorithmInstanceId,
    eventId,
    eventData
  }: {
    algorithmInstanceId: string;
    eventId: string;
    eventData?: Buffer;
  }): Promise<void> {
    this.splitMode.requireTransferHandler(
      this.transferHandler,
      "Uploading bridged algorithm event data"
    );
    if (!eventData) {
      throw new DataPlaneError(
        `No data provided for algorithm event ${eventId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );
    const event = await this.getAlgorithmEvent(algorithmInstanceId, eventId);

    if (!event.isOwnEvent) {
      throw new DataPlaneError(
        `Refusing bridged data upload for non-own event ${eventId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    event.data = eventData;
    await Promise.all(
      event.recipients?.map(async (recipient) => {
        const recipientTransfer = algorithmInstance.transfers.find(
          (transfer) =>
            transfer.remoteParty === recipient && transfer.role === "consumer"
        );
        if (recipientTransfer) {
          await this.forwardEventDataToParticipant(
            recipientTransfer,
            algorithmInstanceId,
            eventId,
            eventData
          );
        }
      }) ?? []
    );

    await this.algorithmEventsRepository.save(event);
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
    const event = await this.algorithmEventsRepository.findOne({
      where: { eventId, algorithmInstance: { id: algorithmInstanceId } },
      select: ["id", "data"]
    });
    if (!event || !event.data) {
      throw new DataPlaneError(
        `Algorithm event with ID ${eventId} not found or no data available`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    const token = parseToken(authorizationHeader);

    if (
      this.algorithmInstancesService.isValidJobAccessToken(
        token,
        algorithmInstanceId
      )
    ) {
      // If no transfer for secret, try internal events token
      await this.algorithmInstancesService.validateAccessToken(
        algorithmInstanceId,
        token
      );
      return event.data;
    } else {
      if (!this.transferHandler) {
        throw new DataPlaneError(
          "Transfer-based event retrieval is not available in this runtime mode",
          HttpStatus.NOT_IMPLEMENTED
        ).andLog(this.logger);
      }
      const transfer = await this.transferHandler.getTransferBySecret(token);

      if (
        transfer &&
        algorithmInstance.transfers.some((t) => t.id === transfer.id)
      ) {
        return event.data;
      }
    }
  }

  async getAlgorithmEvent(algorithmInstanceId: string, eventId: string) {
    const event = await this.algorithmEventsRepository.findOne({
      where: { eventId, algorithmInstance: { id: algorithmInstanceId } }
    });

    if (!event) {
      throw new DataPlaneError(
        `Algorithm event with ID ${eventId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    return event;
  }

  async getEventDataForManagement(
    algorithmInstanceId: string,
    eventId: string
  ): Promise<Buffer | null> {
    const event = await this.algorithmEventsRepository.findOne({
      where: { eventId, algorithmInstance: { id: algorithmInstanceId } },
      select: ["id", "data"]
    });
    if (!event || !event.data) {
      return null;
    }
    return event.data;
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
        timestamp: event.timestamp,
        data: event.data ?? undefined
      }))
    };
  }

  async pollForAlgorithmEvent(
    algorithmInstanceId: string,
    since?: string,
    longPollingInterval: number = 27500
  ): Promise<AlgorithmEventDto> {
    const sinceDate = since ? new Date(since) : undefined;

    await this.algorithmInstancesService.getAlgorithmInstance(
      algorithmInstanceId
    );

    const existingEvent = await this.findNextAlgorithmEvent(
      algorithmInstanceId,
      sinceDate
    );
    if (existingEvent) {
      return existingEvent;
    }

    try {
      await this.eventEmitter.waitFor(
        `event.created.${algorithmInstanceId}`,
        longPollingInterval
      );
    } catch {
      throw new HttpException("", HttpStatus.NO_CONTENT);
    }

    const newEvent = await this.findNextAlgorithmEvent(
      algorithmInstanceId,
      sinceDate
    );
    if (newEvent) {
      return newEvent;
    }

    throw new HttpException("", HttpStatus.NO_CONTENT);
  }

  private async findNextAlgorithmEvent(
    algorithmInstanceId: string,
    since?: Date
  ): Promise<AlgorithmEventDto | null> {
    const event = await this.algorithmEventsRepository.findOne({
      where: {
        algorithmInstance: { id: algorithmInstanceId },
        isOwnEvent: false,
        ...(since && { timestamp: MoreThan(since) })
      },
      order: { timestamp: "ASC" }
    });

    if (!event) {
      return null;
    }

    return {
      id: event.id,
      eventId: event.eventId,
      algorithmInstanceId: algorithmInstanceId,
      name: event.name,
      number: event.number,
      timestamp: event.timestamp,
      createdBy: event.createdBy,
      transferIds: event.transferIds,
      recipients: event.recipients
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
        throw new DataPlaneError(
          `No endpoint found for transfer ${transfer.id}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        ).andLog(this.logger);
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

  async forwardEventDataToParticipant(
    transfer: TransferDao,
    algorithmInstanceId: string,
    eventId: string,
    eventData: Buffer
  ): Promise<void> {
    try {
      if (!transfer.dataAddress || !transfer.dataAddress.endpoint) {
        throw new DataPlaneError(
          `No endpoint found for transfer ${transfer.id}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        ).andLog(this.logger);
      }

      const targetEndpoint = `${transfer.dataAddress.endpoint}/events/${algorithmInstanceId}/upload/${eventId}`;

      this.logger.log(
        `Forwarding event data to ${transfer.remoteParty} at ${targetEndpoint}`
      );

      const response = await axios.post(targetEndpoint, eventData, {
        headers: {
          ...getAxiosConfigFromDataAddress(transfer).headers,
          "Content-Type": "application/octet-stream"
        }
      });

      this.logger.log(
        `Successfully forwarded event data to ${transfer.remoteParty}. Response status: ${response.status}`
      );
    } catch (error) {
      throw parseNetworkError(
        error,
        `forwarding event data to participant ${transfer.remoteParty}`
      ).andLog(this.logger);
    }
  }

  /**
   * Upserts a remote algorithm event received from the bridge server.
   * This is called on client mode when the server forwards events from other participants.
   */
  async upsertRemoteAlgorithmEventFromBridge(body: {
    algorithmInstanceId: string;
    event: {
      eventId: string;
      name?: string;
      number?: number;
      timestamp: string;
      recipients?: string[];
    };
    createdBy: string;
    transferIds?: string[];
  }): Promise<void> {
    this.logger.log(
      `Upserting remote algorithm event ${body.event.eventId} for instance ${body.algorithmInstanceId} from bridge`
    );

    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        body.algorithmInstanceId
      );

    // Check if event already exists
    const existingEvent = await this.algorithmEventsRepository.findOne({
      where: {
        eventId: body.event.eventId,
        algorithmInstance: { id: body.algorithmInstanceId }
      }
    });

    if (existingEvent) {
      this.logger.debug(
        `Event ${body.event.eventId} already exists, skipping upsert`
      );
      return;
    }

    await this.algorithmEventsRepository.save({
      id: `urn:uuid:${crypto.randomUUID()}`,
      eventId: body.event.eventId,
      algorithmInstance,
      name: body.event.name,
      number: body.event.number,
      timestamp: body.event.timestamp,
      createdBy: body.createdBy,
      isOwnEvent: false,
      transferIds: body.transferIds,
      recipients: body.event.recipients
    });

    this.eventEmitter.emit(`event.created.${body.algorithmInstanceId}`);
  }

  /**
   * Applies event data received from the bridge server.
   * This is called on client mode when the server forwards event data from other participants.
   */
  async applyRemoteAlgorithmEventDataFromBridge(body: {
    algorithmInstanceId: string;
    eventId: string;
    eventData?: Uint8Array;
  }): Promise<void> {
    this.logger.log(
      `Applying remote algorithm event data for ${body.eventId} (instance ${body.algorithmInstanceId}) from bridge`
    );

    if (!body.eventData) {
      this.logger.warn(
        `No event data provided for event ${body.eventId}, skipping`
      );
      return;
    }

    const event = await this.algorithmEventsRepository.findOne({
      where: {
        eventId: body.eventId,
        algorithmInstance: { id: body.algorithmInstanceId }
      }
    });

    if (!event) {
      throw new DataPlaneError(
        `Algorithm event with ID ${body.eventId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    event.data = Buffer.from(body.eventData);
    await this.algorithmEventsRepository.save(event);
  }
}
