import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type {
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";

import type { InternalEventMap } from "../../internal-events/internal-events.js";
import { INTERNAL_EVENTS } from "../../internal-events/internal-events.js";
import { SplitModeService } from "../split-mode/split-mode.service.js";
import { BridgeWsPublisherService } from "./bridge-ws-publisher.service.js";

@Injectable()
export class BridgeWsServerListeners {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly splitMode: SplitModeService,
    private readonly publisher: BridgeWsPublisherService
  ) {}

  @OnEvent(INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED)
  onAlgorithmInstancesCreated(
    payload: InternalEventMap[typeof INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED]
  ): void {
    if (!this.splitMode.shouldBridgeAlgorithmInstancesToClients) {
      return;
    }

    this.logger.debug(
      `Publishing algorithm instance created: ${payload.algorithmInstance.id}`
    );
    this.publisher.pushAlgorithmInstance(payload.algorithmInstance, "created");
  }

  @OnEvent(INTERNAL_EVENTS.ALGORITHM_INSTANCES_UPDATED)
  onAlgorithmInstancesUpdated(
    payload: InternalEventMap[typeof INTERNAL_EVENTS.ALGORITHM_INSTANCES_UPDATED]
  ): void {
    if (!this.splitMode.shouldBridgeAlgorithmInstancesToClients) {
      return;
    }

    this.logger.debug(
      `Publishing algorithm instance updated: ${payload.algorithmInstance.id}`
    );
    this.publisher.pushAlgorithmInstance(payload.algorithmInstance, "updated");
  }

  @OnEvent(INTERNAL_EVENTS.ALGORITHM_INSTANCES_DELETED)
  onAlgorithmInstancesDeleted(
    payload: InternalEventMap[typeof INTERNAL_EVENTS.ALGORITHM_INSTANCES_DELETED]
  ): void {
    if (!this.splitMode.shouldBridgeAlgorithmInstancesToClients) {
      return;
    }

    this.logger.debug(
      `Publishing algorithm instance deleted: ${payload.algorithmInstanceId}`
    );
    this.publisher.pushDeleteAlgorithmInstance(payload.algorithmInstanceId);
  }

  @OnEvent(INTERNAL_EVENTS.ALGORITHM_INSTANCES_START_REQUESTED)
  onAlgorithmInstanceStartRequested(
    payload: InternalEventMap[typeof INTERNAL_EVENTS.ALGORITHM_INSTANCES_START_REQUESTED]
  ): void {
    if (!this.splitMode.shouldDelegateStartToClientRunner) {
      return;
    }

    this.logger.log(
      `Delegating start command for algorithm instance ${payload.algorithmInstanceId} to client runner`
    );
    this.publisher.pushStartAlgorithmInstance(
      payload.algorithmInstanceId,
      payload.requestedAt
    );
  }

  @OnEvent(INTERNAL_EVENTS.ALGORITHM_EVENTS_RECEIVED)
  onAlgorithmEventReceived(
    payload: InternalEventMap[typeof INTERNAL_EVENTS.ALGORITHM_EVENTS_RECEIVED]
  ): void {
    if (!this.splitMode.shouldBridgeAlgorithmEventsToClients) {
      return;
    }

    this.logger.debug(
      `Forwarding algorithm event ${payload.event.eventId} to bridge clients`
    );
    this.publisher.pushAlgorithmEventCreated(
      payload as BridgePushAlgorithmEventDto
    );
  }

  @OnEvent(INTERNAL_EVENTS.ALGORITHM_EVENT_DATA_RECEIVED)
  onAlgorithmEventDataReceived(
    payload: InternalEventMap[typeof INTERNAL_EVENTS.ALGORITHM_EVENT_DATA_RECEIVED]
  ): void {
    if (!this.splitMode.shouldBridgeAlgorithmEventsToClients) {
      return;
    }

    this.logger.debug(
      `Forwarding algorithm event data for ${payload.eventId} to bridge clients`
    );
    this.publisher.pushAlgorithmEventData(
      payload as BridgePushAlgorithmEventDataDto
    );
  }
}
