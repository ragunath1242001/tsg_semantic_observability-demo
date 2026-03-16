import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import type {
  BridgeAlgorithmEventDataChunkDto,
  CreateAlgorithmEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { AuthClientService, AuthConfig } from "@tsg-dsp/common-api";
import crypto from "crypto";
import { io, Socket } from "socket.io-client";

import { RootConfig } from "../../config.js";

type Listener = {
  event: string;
  handler: (...args: unknown[]) => void | Promise<void>;
};

type QueuedMessage = {
  event: string;
  payload: unknown;
};

/**
 * Default chunk size for large event data transfers (512KB).
 * Socket.IO default maxHttpBufferSize is 1MB, so we use a smaller chunk
 * to leave room for message overhead and ensure reliable transmission.
 */
const DEFAULT_CHUNK_SIZE = 512 * 1024;

/**
 * How long (ms) to wait for the bridge WS to reconnect before giving up
 * on a pending ack-based call.
 */
const RECONNECT_WAIT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class BridgeWsClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(this.constructor.name);
  private socket?: Socket;
  private readonly listeners: Listener[] = [];
  private readonly chunkSize: number;
  /** Messages queued while the socket is temporarily disconnected. */
  private readonly pendingQueue: QueuedMessage[] = [];

  constructor(
    private readonly config: RootConfig,
    private readonly authClientService: AuthClientService,
    private readonly authConfig: AuthConfig
  ) {
    this.chunkSize = this.config.split.bridgeChunkSize ?? DEFAULT_CHUNK_SIZE;
  }

  async onModuleInit(): Promise<void> {
    if (this.config.split.mode !== "client") {
      return;
    }

    const url = this.peerWsUrl;
    if (!url) {
      this.logger.warn("Bridge WS peer URL not configured; bridge disabled");
      return;
    }

    const parsedUrl = new URL(url);
    const basePath = parsedUrl.pathname.replace(/\/$/, "");
    const path = `${basePath}/bridge/ws`;

    const token = this.authConfig.enabled
      ? await this.authClientService.getToken()
      : undefined;

    this.socket = io(parsedUrl.origin, {
      path,
      transports: ["websocket"],
      reconnection: true,
      extraHeaders: token ? { authorization: `Bearer ${token}` } : undefined
    });

    this.socket.on("connect", () => {
      this.logger.log(`Connected to bridge WS peer (${this.socket?.id})`);
      this.drainQueue();
    });

    this.socket.on("disconnect", (reason) => {
      this.logger.warn(`Bridge WS disconnected: ${reason}`);
    });

    this.socket.on("connect_error", (err) => {
      this.logger.error(`Bridge WS connect error: ${String(err)}`);
    });

    // Refresh the auth token before each reconnection attempt so that an
    // expired token does not permanently block automatic reconnects.
    this.socket.io.on("reconnect_attempt", async (attempt) => {
      this.logger.log(`Bridge WS reconnect attempt #${attempt}`);
      if (this.authConfig.enabled) {
        try {
          const newToken = await this.authClientService.getToken();
          this.socket!.io.opts.extraHeaders = {
            authorization: `Bearer ${newToken}`
          };
        } catch (err) {
          this.logger.error(
            `Bridge WS failed to refresh token for reconnect: ${String(err)}`
          );
        }
      }
    });

    this.socket.io.on("reconnect", (attempt) => {
      this.logger.log(`Bridge WS reconnected after ${attempt} attempt(s)`);
    });

    this.socket.io.on("reconnect_error", (err) => {
      this.logger.warn(`Bridge WS reconnect error: ${String(err)}`);
    });

    this.socket.io.on("reconnect_failed", () => {
      this.logger.error(
        "Bridge WS failed to reconnect; pending queue will be retained until next connect"
      );
    });

    for (const { event, handler } of this.listeners) {
      this.socket.on(event, handler);
    }
  }

  onModuleDestroy(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  private get peerWsUrl(): string | undefined {
    return this.config.split.bridgePeerWsUrl;
  }

  on<TPayload = unknown>(
    event: string,
    handler: (payload: TPayload) => void | Promise<void>
  ): void {
    const wrapped: Listener["handler"] = (payload: unknown) =>
      handler(payload as TPayload);
    this.listeners.push({ event, handler: wrapped });
    this.socket?.on(event, wrapped);
  }

  emit(event: string, payload: unknown): void {
    if (!this.socket) {
      this.logger.warn(`Bridge WS not initialised; skipping emit ${event}`);
      return;
    }

    if (!this.socket.connected) {
      this.logger.warn(
        `Bridge WS not connected; queuing emit ${event} (queue length: ${this.pendingQueue.length + 1})`
      );
      this.pendingQueue.push({ event, payload });
      return;
    }

    this.socket.emit(event, payload);
  }

  /**
   * Re-emits all messages that were queued while the socket was disconnected.
   * Called automatically on every successful (re)connect.
   */
  private drainQueue(): void {
    if (this.pendingQueue.length === 0) {
      return;
    }

    this.logger.log(
      `Bridge WS (re)connected; draining ${this.pendingQueue.length} queued message(s)`
    );

    while (this.pendingQueue.length > 0 && this.socket?.connected) {
      const item = this.pendingQueue.shift()!;
      this.logger.debug(`Sending queued message: ${item.event}`);
      this.socket.emit(item.event, item.payload);
    }
  }

  /**
   * Returns a Promise that resolves when the socket connects (or immediately
   * if it is already connected).  Rejects after {@link RECONNECT_WAIT_TIMEOUT_MS}
   * if no connection has been established.
   */
  private waitForConnection(
    timeoutMs = RECONNECT_WAIT_TIMEOUT_MS
  ): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.socket?.off("connect", onConnect);
        reject(
          new Error(
            `Timed out waiting for bridge WS to reconnect after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      const onConnect = () => {
        clearTimeout(timer);
        resolve();
      };

      this.socket?.once("connect", onConnect);
    });
  }

  /**
   * Emits an algorithm event creation request and waits for server acknowledgment.
   * This ensures the event exists on the server before any subsequent data upload.
   */
  async emitAlgorithmEventCreate(payload: {
    algorithmInstanceId: string;
    event: CreateAlgorithmEventDto;
  }): Promise<void> {
    if (!this.socket) {
      this.logger.warn(
        `Bridge WS not initialised; skipping emit algorithm event create for ${payload.event.eventId}`
      );
      return;
    }

    if (!this.socket.connected) {
      this.logger.warn(
        `Bridge WS not connected; waiting to emit algorithm event create for ${payload.event.eventId}`
      );
      await this.waitForConnection();
    }

    this.logger.log(
      `Sending algorithm event create for ${payload.event.eventId} and waiting for server acknowledgment`
    );

    await this.emitWithAck("client.algorithm-events.create", payload);

    this.logger.log(
      `Server acknowledged algorithm event create for ${payload.event.eventId}`
    );
  }

  /**
   * Emits algorithm event data using chunked transfer if the data exceeds the chunk size.
   * This ensures reliable transmission of large binary payloads over WebSocket.
   */
  async emitAlgorithmEventData({
    algorithmInstanceId,
    eventId,
    eventData
  }: {
    algorithmInstanceId: string;
    eventId: string;
    eventData: Buffer;
  }): Promise<void> {
    if (!this.socket) {
      this.logger.warn(
        `Bridge WS not initialised; skipping emit algorithm event data for ${eventId}`
      );
      return;
    }

    if (!this.socket.connected) {
      this.logger.warn(
        `Bridge WS not connected; waiting to emit algorithm event data for ${eventId}`
      );
      await this.waitForConnection();
    }

    // If data is small enough, send it in a single message
    if (eventData.length <= this.chunkSize) {
      this.logger.log(
        `Sending algorithm event data for ${eventId} in single message (${eventData.length} bytes)`
      );
      this.socket.emit("client.algorithm-events.upload-data", {
        algorithmInstanceId,
        eventId,
        eventData
      });
      return;
    }

    // Use chunked transfer for larger data
    const transferId = crypto.randomUUID();
    const totalChunks = Math.ceil(eventData.length / this.chunkSize);

    this.logger.log(
      `Starting chunked transfer ${transferId} for event ${eventId}: ${eventData.length} bytes in ${totalChunks} chunks`
    );

    // Chunks must be sent sequentially to ensure ordered delivery and backpressure handling
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, eventData.length);
      const chunkData = eventData.subarray(start, end);

      const chunk: BridgeAlgorithmEventDataChunkDto = {
        algorithmInstanceId,
        eventId,
        transferId,
        chunkIndex: i,
        totalChunks,
        totalSize: eventData.length,
        isFinal: i === totalChunks - 1,
        chunkData
      };

      // Wait for acknowledgment before sending next chunk - sequential sending is intentional
      // eslint-disable-next-line no-await-in-loop
      await this.emitWithAck(
        "client.algorithm-events.upload-data-chunk",
        chunk
      );

      this.logger.debug(
        `Sent chunk ${i + 1}/${totalChunks} for transfer ${transferId}`
      );
    }

    this.logger.log(
      `Completed chunked transfer ${transferId} for event ${eventId}`
    );
  }

  /**
   * Emits an event and waits for acknowledgment from the server.
   * Times out after 30 seconds.
   */
  private async emitWithAck(
    event: string,
    payload: unknown,
    timeout = 30000
  ): Promise<unknown> {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ack on ${event}`));
      }, timeout);

      this.socket!.emit(event, payload, (response: unknown) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }
}
