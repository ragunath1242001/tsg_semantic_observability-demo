import { jest } from "@jest/globals";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import type {
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";

import { RootConfig } from "../../config.js";
import { INTERNAL_EVENTS } from "../../internal-events/internal-events.js";
import { SplitModeService } from "../split-mode/split-mode.service.js";
import { BridgeWsGateway } from "./bridge-ws.gateway.js";
import { BridgeWsPublisherService } from "./bridge-ws-publisher.service.js";
import { BridgeWsServerListeners } from "./bridge-ws-server.listeners.js";

describe("BridgeWsServerListeners", () => {
  it("publishes peer algorithm events to clients", async () => {
    const gateway = {
      pushAlgorithmEventCreated: jest.fn(),
      pushAlgorithmEventData: jest.fn()
    } as unknown as Pick<
      BridgeWsGateway,
      "pushAlgorithmEventCreated" | "pushAlgorithmEventData"
    >;

    const config = {
      split: { mode: "server" }
    } as unknown as RootConfig;

    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        BridgeWsPublisherService,
        BridgeWsServerListeners,
        SplitModeService,
        { provide: RootConfig, useValue: config },
        { provide: BridgeWsGateway, useValue: gateway }
      ]
    }).compile();

    // Ensure @OnEvent listeners are registered.
    await moduleRef.init();

    const emitter = moduleRef.get(EventEmitter2);

    const createdPayload: BridgePushAlgorithmEventDto = {
      algorithmInstanceId: "urn:uuid:instance",
      id: "urn:uuid:event-db-id",
      createdBy: "did:web:peer",
      event: {
        eventId: "urn:uuid:event",
        name: "peer-event",
        number: 1,
        timestamp: new Date().toISOString()
      }
    };

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_EVENTS_RECEIVED, createdPayload);
    expect(gateway.pushAlgorithmEventCreated).toHaveBeenCalledWith(
      createdPayload
    );

    const dataPayload: BridgePushAlgorithmEventDataDto = {
      algorithmInstanceId: "urn:uuid:instance",
      eventId: "urn:uuid:event",
      eventData: Buffer.from("hi")
    };

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_EVENT_DATA_RECEIVED, dataPayload);
    expect(gateway.pushAlgorithmEventData).toHaveBeenCalledWith(dataPayload);
  });
});
