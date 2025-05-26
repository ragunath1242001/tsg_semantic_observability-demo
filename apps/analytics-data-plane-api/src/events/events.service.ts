import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AnalysesService } from "../analyses/analyses.service.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { AlgorithmEventDao } from "./dao/algorithm-event.dao.js";
import { InternalEventDao } from "./dao/internal-event.dao.js";
import { CreateAlgorithmEventDto } from "./dto/create-algorithm-event.dto.js";
import { CreateInternalEventDto } from "./dto/create-internal-event.dto.js";

@Injectable()
export class EventsService {
  constructor(
    private readonly dataPlaneService: DataPlaneService,
    private readonly analysesService: AnalysesService,
    @InjectRepository(AlgorithmEventDao)
    private readonly algorithmEventsRepository: Repository<AlgorithmEventDao>,
    @InjectRepository(InternalEventDao)
    private readonly internalEventsRepository: Repository<InternalEventDao>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async createInternalEvent({
    analysisId,
    createInternalEvent: createInternalEvent
  }: {
    analysisId: string;
    createInternalEvent: CreateInternalEventDto;
  }) {
    const analysis = await this.analysesService.getAnalyis(analysisId);

    const event = this.internalEventsRepository.create({
      analysis,
      ...createInternalEvent
    });

    await this.internalEventsRepository.save(event);

    return event;
  }

  async createAlgorithmEvent({
    createEvent,
    analysisId,
    authorizationHeader
  }: {
    createEvent: CreateAlgorithmEventDto;
    analysisId: string;
    authorizationHeader: string;
  }) {
    let createdBy: string;
    let transferId: string | undefined;

    const analysis = await this.analysesService.getAnalyis(analysisId);
    const token = this.parseToken(authorizationHeader);

    if (createEvent.isOwnEvent) {
      // Check if the token from the header is valid
      await this.analysesService.verifyAnalysisToken(analysisId, token);
      createdBy = await this.dataPlaneService.getParticipantId();
    } else {
      // Get the corresponding transfer and check the token
      const transfer = await this.dataPlaneService.getTransferBySecret(token);

      createdBy = transfer.remoteParty;
      transferId = transfer.id;
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
      analysis,
      name: createEvent.name,
      number: createEvent.number,
      timestamp: createEvent.timestamp,
      createdBy,
      isOwnEvent: createEvent.isOwnEvent === true,
      transferId: transferId
    });

    // TODO: If isOwnEvent; send the event to all specified recipients (get the transfers, etc.)

    return await this.algorithmEventsRepository.save(event);
  }

  async uploadAlgorithmEventData({
    analysisId,
    eventId,
    eventData,
    authorizationHeader
  }: {
    analysisId: string;
    eventId: string;
    eventData: Buffer;
    authorizationHeader: string;
  }) {
    const token = this.parseToken(authorizationHeader);
    await this.analysesService.verifyAnalysisToken(analysisId, token);

    const event = await this.getAlgorithmEvent(analysisId, eventId);
    event.data = eventData;
    return await this.algorithmEventsRepository.save(event);
  }

  async getEventData({
    analysisId,
    eventId,
    authorizationHeader
  }: {
    analysisId: string;
    eventId: string;
    authorizationHeader: string;
  }) {
    const analysis = await this.analysesService.getAnalyis(analysisId);
    const event = await this.getAlgorithmEvent(analysisId, eventId);

    const token = this.parseToken(authorizationHeader);

    if (event.isOwnEvent) {
      // If no transfer for secret, try internal events token
      await this.analysesService.verifyAnalysisToken(analysisId, token);
      return event.data;
    } else {
      const transfer = await this.dataPlaneService.getTransferBySecret(token);

      if (transfer && analysis.transfers.some((t) => t.id === transfer.id)) {
        return event.data;
      }
    }
  }

  async getAlgorithmEvent(analyisId: string, eventId: string) {
    const event = await this.algorithmEventsRepository.findOne({
      where: { eventId, analysis: { id: analyisId } }
    });

    if (!event) {
      throw new DataPlaneError(
        `Algorithm event with ID ${eventId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    return event;
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
