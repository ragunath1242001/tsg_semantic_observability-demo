import type {
  BridgeDeleteAlgorithmInstanceDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto,
  BridgePushAlgorithmInstanceDto,
  BridgeStartAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { vi } from "vitest";

import { SplitModeService } from "../split-mode/split-mode.service.js";
import type {
  AlgorithmEventBridgeHandler,
  AlgorithmInstanceBridgeHandler
} from "./bridge-ws-client.listeners.js";
import { BridgeWsClientListeners } from "./bridge-ws-client.listeners.js";
import type { BridgeWsClientService } from "./bridge-ws-client.service.js";

type OnCallback = (payload: unknown) => void | Promise<void>;

function createListeners(mode: string) {
  const splitMode = {
    isClientMode: mode === "client"
  } as SplitModeService;

  // Capture registered listeners in a map
  const registered = new Map<string, OnCallback>();
  const bridgeWs = {
    on: vi.fn((event: string, handler: OnCallback) => {
      registered.set(event, handler);
    })
  } as unknown as BridgeWsClientService;

  const listeners = new BridgeWsClientListeners(splitMode, bridgeWs);

  const instanceHandler: AlgorithmInstanceBridgeHandler = {
    upsertAlgorithmInstancesFromBridge: vi.fn().mockResolvedValue(undefined),
    deleteAlgorithmInstanceFromBridge: vi.fn().mockResolvedValue(undefined),
    startAlgorithmInstance: vi.fn().mockResolvedValue(undefined)
  };

  const eventHandler: AlgorithmEventBridgeHandler = {
    upsertRemoteAlgorithmEventFromBridge: vi.fn().mockResolvedValue(undefined),
    applyRemoteAlgorithmEventDataFromBridge: vi
      .fn()
      .mockResolvedValue(undefined)
  };

  return {
    listeners,
    bridgeWs,
    instanceHandler,
    eventHandler,
    registered
  };
}

describe("BridgeWsClientListeners", () => {
  describe("in non-client mode", () => {
    it("does not register any listeners", () => {
      const { listeners, bridgeWs } = createListeners("server");
      listeners.onModuleInit();
      expect(bridgeWs.on).not.toHaveBeenCalled();
    });
  });

  describe("in client mode", () => {
    it("registers all expected listeners", () => {
      const { listeners, bridgeWs } = createListeners("client");
      listeners.onModuleInit();

      const registeredEvents = (bridgeWs.on as any).mock.calls.map(
        (c: unknown[]) => c[0]
      );
      expect(registeredEvents).toContain("server.algorithm-instances");
      expect(registeredEvents).toContain("server.algorithm-instances.delete");
      expect(registeredEvents).toContain("server.algorithm-instances.start");
      expect(registeredEvents).toContain("server.algorithm-events.created");
      expect(registeredEvents).toContain("server.algorithm-events.upload-data");
    });

    describe("algorithm instance listeners", () => {
      it("handles algorithm instance upsert", async () => {
        const { listeners, instanceHandler, registered } =
          createListeners("client");
        listeners.setAlgorithmInstanceHandler(instanceHandler);
        listeners.onModuleInit();

        const payload: BridgePushAlgorithmInstanceDto = {
          algorithmInstance: {
            id: "inst-1",
            algorithmDefinition: {} as any,
            participants: [],
            status: "pending",
            createdDate: new Date()
          },
          reason: "created"
        };

        const handler = registered.get("server.algorithm-instances")!;
        await handler(payload);

        expect(
          instanceHandler.upsertAlgorithmInstancesFromBridge
        ).toHaveBeenCalledWith([payload.algorithmInstance]);
      });

      it("handles algorithm instance deletion", async () => {
        const { listeners, instanceHandler, registered } =
          createListeners("client");
        listeners.setAlgorithmInstanceHandler(instanceHandler);
        listeners.onModuleInit();

        const payload: BridgeDeleteAlgorithmInstanceDto = {
          algorithmInstanceId: "inst-1"
        };

        const handler = registered.get("server.algorithm-instances.delete")!;
        await handler(payload);

        expect(
          instanceHandler.deleteAlgorithmInstanceFromBridge
        ).toHaveBeenCalledWith("inst-1");
      });

      it("handles algorithm instance start", async () => {
        const { listeners, instanceHandler, registered } =
          createListeners("client");
        listeners.setAlgorithmInstanceHandler(instanceHandler);
        listeners.onModuleInit();

        const payload: BridgeStartAlgorithmInstanceDto = {
          algorithmInstanceId: "inst-1"
        };

        const handler = registered.get("server.algorithm-instances.start")!;
        await handler(payload);

        expect(instanceHandler.startAlgorithmInstance).toHaveBeenCalledWith({
          algorithmInstanceId: "inst-1",
          isInitiator: true,
          authorizationHeader: undefined
        });
      });

      it("warns when no handler is registered", async () => {
        const { listeners, registered } = createListeners("client");
        // Do NOT set handler
        listeners.onModuleInit();

        const handler = registered.get("server.algorithm-instances")!;
        // Should not throw – just logs a warning
        await expect(
          handler({
            algorithmInstance: { id: "inst-1" },
            reason: "created"
          })
        ).resolves.toBeUndefined();
      });
    });

    describe("algorithm event listeners", () => {
      it("handles algorithm event created", async () => {
        const { listeners, eventHandler, registered } =
          createListeners("client");
        listeners.setAlgorithmEventHandler(eventHandler);
        listeners.onModuleInit();

        const payload: BridgePushAlgorithmEventDto = {
          algorithmInstanceId: "inst-1",
          id: "db-id",
          createdBy: "did:web:peer",
          event: {
            eventId: "ev-1",
            name: "metric",
            number: 1,
            timestamp: new Date().toISOString()
          }
        };

        const handler = registered.get("server.algorithm-events.created")!;
        await handler(payload);

        expect(
          eventHandler.upsertRemoteAlgorithmEventFromBridge
        ).toHaveBeenCalledWith(payload);
      });

      it("handles algorithm event data upload", async () => {
        const { listeners, eventHandler, registered } =
          createListeners("client");
        listeners.setAlgorithmEventHandler(eventHandler);
        listeners.onModuleInit();

        const payload: BridgePushAlgorithmEventDataDto = {
          algorithmInstanceId: "inst-1",
          eventId: "ev-1",
          eventData: Buffer.from("data")
        };

        const handler = registered.get("server.algorithm-events.upload-data")!;
        await handler(payload);

        expect(
          eventHandler.applyRemoteAlgorithmEventDataFromBridge
        ).toHaveBeenCalledWith(payload);
      });

      it("warns when no event handler is registered", async () => {
        const { listeners, registered } = createListeners("client");
        // Do NOT set event handler
        listeners.onModuleInit();

        const handler = registered.get("server.algorithm-events.created")!;
        await expect(
          handler({
            algorithmInstanceId: "inst-1",
            event: { eventId: "ev-1" }
          })
        ).resolves.toBeUndefined();
      });
    });
  });
});
