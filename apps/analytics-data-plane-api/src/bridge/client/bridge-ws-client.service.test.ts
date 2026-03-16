import type { Socket } from "socket.io-client";
import { vi } from "vitest";

import type { RootConfig } from "../../config.js";
import { BridgeWsClientService } from "./bridge-ws-client.service.js";

// ── helpers ──────────────────────────────────────────────────────────────

/** Minimal mock socket that records `emit` / `on` calls. */
function createMockSocket(connected = true) {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();

  const socket = {
    connected,
    id: "mock-socket-id",
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(handler);
    }),
    once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const handlers = listeners.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    }),
    disconnect: vi.fn()
  } as unknown as Socket;

  return { socket, listeners };
}

function createService(opts?: {
  mode?: string;
  peerUrl?: string;
  chunkSize?: number;
  authEnabled?: boolean;
  token?: string;
}) {
  const config = {
    split: {
      mode: opts?.mode ?? "client",
      bridgePeerWsUrl:
        opts && "peerUrl" in opts ? opts.peerUrl : "http://peer:3000",
      bridgeChunkSize: opts?.chunkSize
    }
  } as RootConfig;

  const authClientService = {
    getToken: vi.fn().mockResolvedValue(opts?.token ?? "test-token")
  };

  const authConfig = {
    enabled: opts?.authEnabled ?? false
  };

  const service = new BridgeWsClientService(
    config,
    authClientService as any,
    authConfig as any
  );

  return { service, config, authClientService, authConfig };
}

/**
 * Inject a mock socket into the service via its private field.
 * This avoids having to mock `socket.io-client` and lets us test
 * the public API surface in isolation.
 */
function injectSocket(service: BridgeWsClientService, socket: Socket) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (service as any).socket = socket;
}

// ── tests ────────────────────────────────────────────────────────────────

describe("BridgeWsClientService", () => {
  // ── lifecycle ───────────────────────────────────────────────────────

  describe("onModuleInit", () => {
    it("does nothing when mode is not client", async () => {
      const { service } = createService({ mode: "server" });
      // Should not throw and should not create a socket
      await service.onModuleInit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).socket).toBeUndefined();
    });

    it("does nothing when mode is standalone", async () => {
      const { service } = createService({ mode: "standalone" });
      await service.onModuleInit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).socket).toBeUndefined();
    });

    it("warns and skips when peer URL is not configured", async () => {
      const { service } = createService({
        mode: "client",
        peerUrl: undefined
      });
      await service.onModuleInit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).socket).toBeUndefined();
    });
  });

  describe("onModuleDestroy", () => {
    it("disconnects the socket on destroy", () => {
      const { service } = createService();
      const { socket } = createMockSocket();
      injectSocket(service, socket);

      service.onModuleDestroy();

      expect(socket.disconnect).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).socket).toBeUndefined();
    });

    it("does not throw when there is no socket", () => {
      const { service } = createService();
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  // ── on ──────────────────────────────────────────────────────────────

  describe("on()", () => {
    it("stores the listener before a socket exists", () => {
      const { service } = createService();
      const handler = vi.fn();
      service.on("some-event", handler);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listeners = (service as any).listeners as {
        event: string;
        handler: (...args: unknown[]) => void;
      }[];
      expect(listeners).toHaveLength(1);
      expect(listeners[0].event).toBe("some-event");
    });

    it("registers the listener on the socket immediately when connected", () => {
      const { service } = createService();
      const { socket } = createMockSocket();
      injectSocket(service, socket);

      const handler = vi.fn();
      service.on("my-event", handler);

      expect(socket.on).toHaveBeenCalledWith("my-event", expect.any(Function));
    });
  });

  // ── emit ────────────────────────────────────────────────────────────

  describe("emit()", () => {
    it("emits the event when connected", () => {
      const { service } = createService();
      const { socket } = createMockSocket(true);
      injectSocket(service, socket);

      service.emit("test-event", { foo: "bar" });

      expect(socket.emit).toHaveBeenCalledWith("test-event", { foo: "bar" });
    });

    it("skips emit and logs warning when not connected", () => {
      const { service } = createService();
      const { socket } = createMockSocket(false);
      injectSocket(service, socket);

      service.emit("test-event", { data: 1 });

      expect(socket.emit).not.toHaveBeenCalled();
    });

    it("skips emit when no socket exists", () => {
      const { service } = createService();
      // No socket injected – should not throw
      expect(() => service.emit("test-event", {})).not.toThrow();
    });
  });

  // ── emitAlgorithmEventCreate ────────────────────────────────────────

  describe("emitAlgorithmEventCreate()", () => {
    it("rejects on reconnect timeout when not connected", async () => {
      const { service } = createService();
      const { socket } = createMockSocket(false);
      injectSocket(service, socket);

      vi.useFakeTimers();

      const promise = service.emitAlgorithmEventCreate({
        algorithmInstanceId: "inst-1",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      });

      const assertion = expect(promise).rejects.toThrow(
        "Timed out waiting for bridge WS to reconnect"
      );

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      await assertion;

      expect(socket.emit).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("emits with ack when connected", async () => {
      const { service } = createService();
      const { socket } = createMockSocket(true);
      injectSocket(service, socket);

      // Mock emit to invoke the ack callback immediately
      (socket.emit as ReturnType<typeof vi.fn>).mockImplementation(
        (_event: string, _payload: unknown, ack?: (res: unknown) => void) => {
          if (ack) ack({ ok: true });
        }
      );

      await service.emitAlgorithmEventCreate({
        algorithmInstanceId: "inst-1",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      });

      expect(socket.emit).toHaveBeenCalledWith(
        "client.algorithm-events.create",
        expect.objectContaining({
          algorithmInstanceId: "inst-1",
          event: expect.objectContaining({ eventId: "ev-1" })
        }),
        expect.any(Function) // ack callback
      );
    });

    it("skips when no socket exists", async () => {
      const { service } = createService();

      // Should not throw
      await service.emitAlgorithmEventCreate({
        algorithmInstanceId: "inst-1",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      });
    });
  });

  // ── emitAlgorithmEventData ──────────────────────────────────────────

  describe("emitAlgorithmEventData()", () => {
    it("rejects on reconnect timeout when not connected", async () => {
      const { service } = createService();
      const { socket } = createMockSocket(false);
      injectSocket(service, socket);

      vi.useFakeTimers();

      const promise = service.emitAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: Buffer.from("hello")
      });

      const assertion = expect(promise).rejects.toThrow(
        "Timed out waiting for bridge WS to reconnect"
      );

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      await assertion;

      expect(socket.emit).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("sends small data in a single message", async () => {
      const { service } = createService();
      const { socket } = createMockSocket(true);
      injectSocket(service, socket);

      const data = Buffer.from("small payload");
      await service.emitAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: data
      });

      expect(socket.emit).toHaveBeenCalledWith(
        "client.algorithm-events.upload-data",
        {
          algorithmInstanceId: "inst-1",
          eventId: "ev-1",
          eventData: data
        }
      );
    });

    it("uses chunked transfer for data exceeding chunk size", async () => {
      const chunkSize = 10;
      const { service } = createService({ chunkSize });
      const { socket } = createMockSocket(true);
      injectSocket(service, socket);

      // Mock emit to invoke the ack callback for each chunk
      (socket.emit as ReturnType<typeof vi.fn>).mockImplementation(
        (_event: string, _payload: unknown, ack?: (res: unknown) => void) => {
          if (ack) ack({ ok: true });
        }
      );

      // 25 bytes → should produce 3 chunks (10 + 10 + 5)
      const data = Buffer.alloc(25, "x");
      await service.emitAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: data
      });

      const chunkCalls = (
        socket.emit as ReturnType<typeof vi.fn>
      ).mock.calls.filter(
        (c: unknown[]) => c[0] === "client.algorithm-events.upload-data-chunk"
      );

      expect(chunkCalls).toHaveLength(3);

      // Verify first chunk metadata
      expect(chunkCalls[0][1]).toMatchObject({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        chunkIndex: 0,
        totalChunks: 3,
        totalSize: 25,
        isFinal: false
      });

      // Verify last chunk is marked final
      expect(chunkCalls[2][1]).toMatchObject({
        chunkIndex: 2,
        totalChunks: 3,
        isFinal: true
      });
    });

    it("sends data exactly at chunk size in a single message", async () => {
      const chunkSize = 10;
      const { service } = createService({ chunkSize });
      const { socket } = createMockSocket(true);
      injectSocket(service, socket);

      const data = Buffer.alloc(10, "x");
      await service.emitAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: data
      });

      // Should send as single message (not chunked), since length <= chunkSize
      expect(socket.emit).toHaveBeenCalledWith(
        "client.algorithm-events.upload-data",
        expect.objectContaining({ eventId: "ev-1" })
      );
    });

    it("uses default chunk size when not configured", () => {
      const { service } = createService({ chunkSize: undefined });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).chunkSize).toBe(512 * 1024);
    });

    it("skips when no socket exists", async () => {
      const { service } = createService();

      await expect(
        service.emitAlgorithmEventData({
          algorithmInstanceId: "inst-1",
          eventId: "ev-1",
          eventData: Buffer.from("data")
        })
      ).resolves.toBeUndefined();
    });
  });

  // ── emitWithAck (timeout behaviour) ────────────────────────────────

  describe("emitWithAck (via emitAlgorithmEventCreate)", () => {
    it("rejects when ack is not received within timeout", async () => {
      const { service } = createService();
      const { socket } = createMockSocket(true);
      injectSocket(service, socket);

      // Mock emit that never calls ack
      (socket.emit as ReturnType<typeof vi.fn>).mockImplementation(() => {
        // intentionally do nothing – no ack
      });

      vi.useFakeTimers();

      const promise = service.emitAlgorithmEventCreate({
        algorithmInstanceId: "inst-1",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      });

      // Attach the rejection handler BEFORE advancing timers so the rejection
      // is never unhandled when the fake timer fires.
      const assertion = expect(promise).rejects.toThrow(
        "Timeout waiting for ack"
      );

      // Advance past the 30s timeout
      await vi.advanceTimersByTimeAsync(30_000);

      await assertion;

      vi.useRealTimers();
    });
  });
});
