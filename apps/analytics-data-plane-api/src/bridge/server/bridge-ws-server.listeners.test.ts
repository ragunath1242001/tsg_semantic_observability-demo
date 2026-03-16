import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import type {
  BridgeAlgorithmInstanceMetadataDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { vi } from "vitest";

import { RootConfig } from "../../config.js";
import { INTERNAL_EVENTS } from "../../internal-events/internal-events.js";
import { SplitModeService } from "../split-mode/split-mode.service.js";
import { BridgeWsGateway } from "./bridge-ws.gateway.js";
import { BridgeWsPublisherService } from "./bridge-ws-publisher.service.js";
import { BridgeWsServerListeners } from "./bridge-ws-server.listeners.js";

async function buildModule(mode: string) {
  const gateway = {
    pushAlgorithmInstance: vi.fn(),
    pushStartAlgorithmInstance: vi.fn(),
    pushDeleteAlgorithmInstance: vi.fn(),
    pushAlgorithmEventCreated: vi.fn(),
    pushAlgorithmEventData: vi.fn()
  } as unknown as BridgeWsGateway;

  const config = {
    split: { mode }
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

  await moduleRef.init();

  const emitter = moduleRef.get(EventEmitter2);
  return { gateway, emitter, moduleRef };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("BridgeWsServerListeners", () => {
  it("publishes peer algorithm events to clients", async () => {
    const { gateway, emitter } = await buildModule("server");

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
    await tick();
    expect(gateway.pushAlgorithmEventCreated).toHaveBeenCalledWith(
      createdPayload
    );

    const dataPayload: BridgePushAlgorithmEventDataDto = {
      algorithmInstanceId: "urn:uuid:instance",
      eventId: "urn:uuid:event",
      eventData: Buffer.from("hi")
    };

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_EVENT_DATA_RECEIVED, dataPayload);
    await tick();
    expect(gateway.pushAlgorithmEventData).toHaveBeenCalledWith(dataPayload);
  });

  it("publishes algorithm instance created to clients", async () => {
    const { gateway, emitter } = await buildModule("server");

    const instance: BridgeAlgorithmInstanceMetadataDto = {
      id: "urn:uuid:inst",
      algorithmDefinition: {} as any,
      participants: [],
      status: "pending",
      createdDate: new Date()
    };

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED, {
      algorithmInstance: instance
    });
    await tick();

    expect(gateway.pushAlgorithmInstance).toHaveBeenCalledWith({
      algorithmInstance: instance,
      reason: "created"
    });
  });

  it("publishes algorithm instance updated to clients", async () => {
    const { gateway, emitter } = await buildModule("server");

    const instance: BridgeAlgorithmInstanceMetadataDto = {
      id: "urn:uuid:inst",
      algorithmDefinition: {} as any,
      participants: [],
      status: "running",
      createdDate: new Date()
    };

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_INSTANCES_UPDATED, {
      algorithmInstance: instance
    });
    await tick();

    expect(gateway.pushAlgorithmInstance).toHaveBeenCalledWith({
      algorithmInstance: instance,
      reason: "updated"
    });
  });

  it("publishes algorithm instance deleted to clients", async () => {
    const { gateway, emitter } = await buildModule("server");

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_INSTANCES_DELETED, {
      algorithmInstanceId: "urn:uuid:inst"
    });
    await tick();

    expect(gateway.pushDeleteAlgorithmInstance).toHaveBeenCalledWith({
      algorithmInstanceId: "urn:uuid:inst"
    });
  });

  it("delegates start request to client runner", async () => {
    const { gateway, emitter } = await buildModule("server");

    const requestedAt = new Date();
    emitter.emit(INTERNAL_EVENTS.ALGORITHM_INSTANCES_START_REQUESTED, {
      algorithmInstanceId: "urn:uuid:inst",
      requestedAt
    });
    await tick();

    expect(gateway.pushStartAlgorithmInstance).toHaveBeenCalledWith({
      algorithmInstanceId: "urn:uuid:inst",
      requestedAt
    });
  });

  it("does not forward events in non-server mode", async () => {
    const { gateway, emitter } = await buildModule("standalone");

    emitter.emit(INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED, {
      algorithmInstance: { id: "inst-1" }
    });
    emitter.emit(INTERNAL_EVENTS.ALGORITHM_EVENTS_RECEIVED, {
      algorithmInstanceId: "inst-1",
      event: { eventId: "ev-1" }
    });
    await tick();

    expect(gateway.pushAlgorithmInstance).not.toHaveBeenCalled();
    expect(gateway.pushAlgorithmEventCreated).not.toHaveBeenCalled();
  });
});
