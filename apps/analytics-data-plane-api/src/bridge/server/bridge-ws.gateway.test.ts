import type {
  BridgeAlgorithmEventDataChunkDto,
  BridgeDeleteDatasetsDto,
  BridgeJobStatusUpdateDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto,
  BridgePushAlgorithmInstanceDto,
  BridgeStartAlgorithmInstanceDto,
  BridgeUpsertDatasetsDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { AuthConfig, OAuthService } from "@tsg-dsp/common-api";
import type { DatasetDto } from "@tsg-dsp/common-dsp";
import { vi } from "vitest";

import type { RootConfig } from "../../config.js";
import type { BridgeService } from "./bridge.service.js";
import { BridgeWsGateway } from "./bridge-ws.gateway.js";

function createGateway() {
  const config = { split: { mode: "server" } } as unknown as RootConfig;

  const bridge = {
    clientUpsertDatasets: vi.fn().mockResolvedValue(undefined),
    clientDeleteDatasets: vi.fn().mockResolvedValue(undefined),
    clientPushJobStatus: vi.fn().mockResolvedValue(undefined),
    clientCreateAlgorithmEvent: vi.fn().mockResolvedValue({ id: "ev-1" }),
    clientUploadAlgorithmEventData: vi.fn().mockResolvedValue(undefined)
  } satisfies Record<string, ReturnType<typeof vi.fn>>;

  const oauthService = {
    validateToken: vi.fn().mockResolvedValue(undefined)
  } as unknown as OAuthService;

  const authConfig = { enabled: false } as AuthConfig;

  const emitMock = vi.fn();
  const gateway = new BridgeWsGateway(
    config,
    bridge as unknown as BridgeService,
    oauthService,
    authConfig
  );

  // Inject a mock server
  Object.defineProperty(gateway, "server", {
    value: { emit: emitMock },
    writable: true
  });

  return { gateway, bridge, oauthService, authConfig, emitMock };
}

describe("BridgeWsGateway", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("push methods", () => {
    it("pushAlgorithmInstance emits to server", () => {
      const { gateway, emitMock } = createGateway();
      const body: BridgePushAlgorithmInstanceDto = {
        algorithmInstance: {
          id: "inst-1",
          algorithmDefinition: {} as any,
          participants: [],
          status: "pending",
          createdDate: new Date()
        }
      };
      gateway.pushAlgorithmInstance(body);
      expect(emitMock).toHaveBeenCalledWith("server.algorithm-instances", body);
    });

    it("pushStartAlgorithmInstance emits to server", () => {
      const { gateway, emitMock } = createGateway();
      const body: BridgeStartAlgorithmInstanceDto = {
        algorithmInstanceId: "inst-1"
      };
      gateway.pushStartAlgorithmInstance(body);
      expect(emitMock).toHaveBeenCalledWith(
        "server.algorithm-instances.start",
        body
      );
    });

    it("pushDeleteAlgorithmInstance emits to server", () => {
      const { gateway, emitMock } = createGateway();
      gateway.pushDeleteAlgorithmInstance({ algorithmInstanceId: "inst-1" });
      expect(emitMock).toHaveBeenCalledWith(
        "server.algorithm-instances.delete",
        { algorithmInstanceId: "inst-1" }
      );
    });

    it("pushAlgorithmEventCreated emits to server", () => {
      const { gateway, emitMock } = createGateway();
      const body: BridgePushAlgorithmEventDto = {
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
      gateway.pushAlgorithmEventCreated(body);
      expect(emitMock).toHaveBeenCalledWith(
        "server.algorithm-events.created",
        body
      );
    });

    it("pushAlgorithmEventData emits to server", () => {
      const { gateway, emitMock } = createGateway();
      const body: BridgePushAlgorithmEventDataDto = {
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: Buffer.from("data")
      };
      gateway.pushAlgorithmEventData(body);
      expect(emitMock).toHaveBeenCalledWith(
        "server.algorithm-events.upload-data",
        body
      );
    });
  });

  describe("client message handlers", () => {
    it("clientUpsertDatasets delegates to bridge", async () => {
      const { gateway, bridge } = createGateway();
      const body: BridgeUpsertDatasetsDto = {
        dataset: { "@id": "urn:uuid:ds-1" } as DatasetDto
      };
      const result = await gateway.clientUpsertDatasets(body);
      expect(bridge.clientUpsertDatasets).toHaveBeenCalledWith(body);
      expect(result).toEqual({ ok: true });
    });

    it("clientDeleteDatasets delegates to bridge", async () => {
      const { gateway, bridge } = createGateway();
      const body: BridgeDeleteDatasetsDto = { datasetId: "urn:uuid:ds-1" };
      const result = await gateway.clientDeleteDatasets(body);
      expect(bridge.clientDeleteDatasets).toHaveBeenCalledWith(body);
      expect(result).toEqual({ ok: true });
    });

    it("clientPushJobStatus delegates to bridge", async () => {
      const { gateway, bridge } = createGateway();
      const body: BridgeJobStatusUpdateDto = {
        algorithmInstanceId: "inst-1",
        status: "running",
        jobName: "job-a"
      };
      const result = await gateway.clientPushJobStatus(body);
      expect(bridge.clientPushJobStatus).toHaveBeenCalledWith(body);
      expect(result).toEqual({ ok: true });
    });

    it("clientCreateAlgorithmEvent delegates to bridge", async () => {
      const { gateway, bridge } = createGateway();
      const body = {
        algorithmInstanceId: "inst-1",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      };
      const result = await gateway.clientCreateAlgorithmEvent(body);
      expect(bridge.clientCreateAlgorithmEvent).toHaveBeenCalledWith(body);
      expect(result).toEqual({ id: "ev-1" });
    });

    it("clientUploadAlgorithmEventData delegates to bridge", async () => {
      const { gateway, bridge } = createGateway();
      const eventData = Buffer.from("data");
      const result = await gateway.clientUploadAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData
      });
      expect(bridge.clientUploadAlgorithmEventData).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData
      });
      expect(result).toEqual({ ok: true });
    });

    it("clientUploadAlgorithmEventData converts non-Buffer to Buffer", async () => {
      const { gateway, bridge } = createGateway();
      const arrayBuffer = new Uint8Array([1, 2, 3]);
      const result = await gateway.clientUploadAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: arrayBuffer as unknown as Buffer
      });
      expect(bridge.clientUploadAlgorithmEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: expect.any(Buffer)
        })
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe("handleConnection / handleDisconnect", () => {
    it("accepts connections when auth is disabled", async () => {
      const { gateway } = createGateway();
      const client = {
        id: "client-1",
        disconnect: vi.fn(),
        handshake: { headers: {} }
      };

      await gateway.handleConnection(client as any);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("rejects connections without auth header when auth is enabled", async () => {
      const { gateway, authConfig } = createGateway();
      (authConfig as any).enabled = true;
      const client = {
        id: "client-1",
        disconnect: vi.fn(),
        handshake: { headers: {} }
      };

      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it("accepts connections with valid token when auth is enabled", async () => {
      const { gateway, authConfig, oauthService } = createGateway();
      (authConfig as any).enabled = true;
      const client = {
        id: "client-1",
        disconnect: vi.fn(),
        handshake: { headers: { authorization: "Bearer valid-token" } }
      };

      await gateway.handleConnection(client as any);
      expect(oauthService.validateToken).toHaveBeenCalledWith("valid-token");
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("rejects connections with invalid token when auth is enabled", async () => {
      const { gateway, authConfig, oauthService } = createGateway();
      (authConfig as any).enabled = true;
      (oauthService.validateToken as any).mockRejectedValue(
        new Error("invalid")
      );
      const client = {
        id: "client-1",
        disconnect: vi.fn(),
        handshake: { headers: { authorization: "Bearer bad-token" } }
      };

      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it("handleDisconnect does not throw", () => {
      const { gateway } = createGateway();
      expect(() =>
        gateway.handleDisconnect({ id: "client-1" } as any)
      ).not.toThrow();
    });
  });

  describe("chunked upload", () => {
    it("assembles chunks and calls bridge when all received", async () => {
      const { gateway, bridge } = createGateway();
      const transferId = "transfer-1";
      const data = Buffer.from("hello world, a longer test payload!");
      const chunkSize = 10;
      const totalChunks = Math.ceil(data.length / chunkSize);

      let lastResult: { ok: true; assembled?: boolean } | undefined;
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = data.subarray(
          i * chunkSize,
          Math.min((i + 1) * chunkSize, data.length)
        );
        const chunk: BridgeAlgorithmEventDataChunkDto = {
          transferId,
          algorithmInstanceId: "inst-1",
          eventId: "ev-1",
          chunkIndex: i,
          totalChunks,
          totalSize: data.length,
          isFinal: i === totalChunks - 1,
          chunkData
        };

        lastResult = await gateway.clientUploadAlgorithmEventDataChunk(chunk);
      }

      expect(lastResult).toEqual({ ok: true, assembled: true });
      expect(bridge.clientUploadAlgorithmEventData).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: expect.any(Buffer)
      });

      // Verify assembled buffer matches original
      const assembled =
        bridge.clientUploadAlgorithmEventData.mock.calls[0]![0].eventData;
      expect(Buffer.compare(assembled!, data)).toBe(0);
    });

    it("returns assembled: false for intermediate chunks", async () => {
      const { gateway } = createGateway();
      const chunk: BridgeAlgorithmEventDataChunkDto = {
        transferId: "transfer-2",
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        chunkIndex: 0,
        totalChunks: 3,
        totalSize: 30,
        isFinal: false,
        chunkData: Buffer.from("0123456789")
      };

      const result = await gateway.clientUploadAlgorithmEventDataChunk(chunk);
      expect(result).toEqual({ ok: true, assembled: false });
    });
  });
});
