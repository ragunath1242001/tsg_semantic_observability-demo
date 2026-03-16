import type {
  BridgeAlgorithmInstanceMetadataDto,
  BridgeDeleteAlgorithmInstanceDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto,
  BridgePushAlgorithmInstanceDto,
  BridgeStartAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { vi } from "vitest";

import type { RootConfig } from "../../config.js";
import type { BridgeWsGateway } from "./bridge-ws.gateway.js";
import { BridgeWsPublisherService } from "./bridge-ws-publisher.service.js";

function createPublisher(mode: string) {
  const config = { split: { mode } } as unknown as RootConfig;

  const gateway = {
    pushAlgorithmInstance: vi.fn(),
    pushStartAlgorithmInstance: vi.fn(),
    pushDeleteAlgorithmInstance: vi.fn(),
    pushAlgorithmEventCreated: vi.fn(),
    pushAlgorithmEventData: vi.fn()
  } satisfies Record<string, ReturnType<typeof vi.fn>>;

  const publisher = new BridgeWsPublisherService(
    config,
    gateway as unknown as BridgeWsGateway
  );

  return { publisher, gateway };
}

const sampleInstance: BridgeAlgorithmInstanceMetadataDto = {
  id: "urn:uuid:test-instance",
  algorithmDefinition:
    {} as BridgeAlgorithmInstanceMetadataDto["algorithmDefinition"],
  participants: [],
  status: "pending",
  createdDate: new Date()
};

describe("BridgeWsPublisherService", () => {
  describe("in server mode", () => {
    it("pushAlgorithmInstance forwards to gateway", () => {
      const { publisher, gateway } = createPublisher("server");
      publisher.pushAlgorithmInstance(sampleInstance, "created");

      expect(gateway.pushAlgorithmInstance).toHaveBeenCalledWith({
        algorithmInstance: sampleInstance,
        reason: "created"
      } satisfies BridgePushAlgorithmInstanceDto);
    });

    it("pushStartAlgorithmInstance forwards to gateway", () => {
      const { publisher, gateway } = createPublisher("server");
      const requestedAt = new Date();
      publisher.pushStartAlgorithmInstance("inst-1", requestedAt);

      expect(gateway.pushStartAlgorithmInstance).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1",
        requestedAt
      } satisfies BridgeStartAlgorithmInstanceDto);
    });

    it("pushDeleteAlgorithmInstance forwards to gateway", () => {
      const { publisher, gateway } = createPublisher("server");
      publisher.pushDeleteAlgorithmInstance("inst-1");

      expect(gateway.pushDeleteAlgorithmInstance).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1"
      } satisfies BridgeDeleteAlgorithmInstanceDto);
    });

    it("pushAlgorithmEventCreated forwards to gateway", () => {
      const { publisher, gateway } = createPublisher("server");
      const body: BridgePushAlgorithmEventDto = {
        algorithmInstanceId: "inst-1",
        id: "ev-db-id",
        createdBy: "did:web:peer",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      };
      publisher.pushAlgorithmEventCreated(body);

      expect(gateway.pushAlgorithmEventCreated).toHaveBeenCalledWith(body);
    });

    it("pushAlgorithmEventData forwards to gateway", () => {
      const { publisher, gateway } = createPublisher("server");
      const body: BridgePushAlgorithmEventDataDto = {
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: Buffer.from("data")
      };
      publisher.pushAlgorithmEventData(body);

      expect(gateway.pushAlgorithmEventData).toHaveBeenCalledWith(body);
    });
  });

  describe("in non-server modes", () => {
    for (const mode of ["standalone", "client"]) {
      it(`pushAlgorithmInstance is no-op in ${mode} mode`, () => {
        const { publisher, gateway } = createPublisher(mode);
        publisher.pushAlgorithmInstance(sampleInstance, "created");
        expect(gateway.pushAlgorithmInstance).not.toHaveBeenCalled();
      });

      it(`pushStartAlgorithmInstance is no-op in ${mode} mode`, () => {
        const { publisher, gateway } = createPublisher(mode);
        publisher.pushStartAlgorithmInstance("inst-1");
        expect(gateway.pushStartAlgorithmInstance).not.toHaveBeenCalled();
      });

      it(`pushDeleteAlgorithmInstance is no-op in ${mode} mode`, () => {
        const { publisher, gateway } = createPublisher(mode);
        publisher.pushDeleteAlgorithmInstance("inst-1");
        expect(gateway.pushDeleteAlgorithmInstance).not.toHaveBeenCalled();
      });

      it(`pushAlgorithmEventCreated is no-op in ${mode} mode`, () => {
        const { publisher, gateway } = createPublisher(mode);
        publisher.pushAlgorithmEventCreated({} as BridgePushAlgorithmEventDto);
        expect(gateway.pushAlgorithmEventCreated).not.toHaveBeenCalled();
      });

      it(`pushAlgorithmEventData is no-op in ${mode} mode`, () => {
        const { publisher, gateway } = createPublisher(mode);
        publisher.pushAlgorithmEventData({} as BridgePushAlgorithmEventDataDto);
        expect(gateway.pushAlgorithmEventData).not.toHaveBeenCalled();
      });
    }
  });
});
