import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import {
  BridgeAlgorithmEventDataChunkDto,
  BridgeClientConnectionDto,
  BridgeCreateAlgorithmEventDto,
  BridgeDeleteAlgorithmInstanceDto,
  BridgeDeleteDatasetsDto,
  BridgeJobStatusUpdateDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto,
  BridgePushAlgorithmInstanceDto,
  BridgeStartAlgorithmInstanceDto,
  BridgeUpsertDatasetsDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { AuthConfig, OAuthService } from "@tsg-dsp/common-api";
import { decodeJwt } from "jose";
import { Server, Socket } from "socket.io";

import { BridgeService } from "./bridge.service.js";

interface ChunkBuffer {
  algorithmInstanceId: string;
  eventId: string;
  totalChunks: number;
  totalSize: number;
  receivedChunks: Map<number, Buffer>;
  createdAt: Date;
}

interface ConnectedClient {
  clientId: string;
  clientIpAddress?: string;
  oauthClientId?: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  status: "connected" | "disconnected";
  lastMessageReceivedAt?: Date;
  lastMessageSentAt?: Date;
}

@WebSocketGateway({
  path: `${process.env["SUBPATH"] || ""}${process.env["EMBEDDED_FRONTEND"] ? "/api" : ""}/bridge/ws`,
  transports: ["websocket"]
})
export class BridgeWsGateway {
  private readonly logger = new Logger(this.constructor.name);

  @WebSocketServer()
  private readonly server!: Server;

  private readonly chunkBuffers = new Map<string, ChunkBuffer>();

  private readonly connectedClients = new Map<string, ConnectedClient>();

  private readonly chunkTimeout = 5 * 60 * 1000;

  constructor(
    private readonly bridge: BridgeService,
    private readonly oauthService: OAuthService,
    private readonly authConfig: AuthConfig
  ) {
    setInterval(() => this.cleanupStaleBuffers(), 60 * 1000);
  }

  async handleConnection(client: Socket): Promise<void> {
    const authorized = await this.isAuthorized(client);
    if (!authorized) {
      this.logger.warn(
        `Rejected bridge WS connection ${client.id}: unauthorized`
      );
      client.disconnect(true);
      return;
    }

    const oauthClientId = this.extractOAuthClientId(client);
    this.connectedClients.set(client.id, {
      clientId: client.id,
      clientIpAddress: this.extractClientIpAddress(client),
      oauthClientId,
      status: "connected",
      connectedAt: new Date()
    });

    this.logger.log(`Accepted bridge WS connection ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const tracked = this.connectedClients.get(client.id);
    if (tracked) {
      tracked.status = "disconnected";
      tracked.disconnectedAt = new Date();
    }
    this.logger.log(`Bridge WS disconnected ${client.id}`);
  }

  private async isAuthorized(client: Socket): Promise<boolean> {
    if (!this.authConfig.enabled) {
      return true;
    }

    // Extract Bearer token from Authorization header
    const authHeader = client.handshake.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      this.logger.debug(
        `Bridge WS connection ${client.id}: missing or invalid Authorization header`
      );
      return false;
    }

    const token = authHeader.substring(7);
    try {
      await this.oauthService.validateToken(token);
      return true;
    } catch (error) {
      this.logger.debug(
        `Bridge WS connection ${client.id}: token validation failed: ${String(error)}`
      );
      return false;
    }
  }

  private extractOAuthClientId(client: Socket): string | undefined {
    if (!this.authConfig.enabled) {
      return undefined;
    }
    const authHeader = client.handshake.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return undefined;
    }
    try {
      const token = authHeader.substring(7);
      const payload = decodeJwt(token);
      return (payload.client_id as string) ?? (payload.azp as string);
    } catch {
      return undefined;
    }
  }

  private extractClientIpAddress(client: Socket): string | undefined {
    const forwardedFor = client.handshake.headers["x-forwarded-for"];
    const forwardedValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;

    if (typeof forwardedValue === "string" && forwardedValue.length > 0) {
      const firstForwardedIp = forwardedValue
        .split(",")
        .map((value) => value.trim())
        .find((value) => value.length > 0);

      if (firstForwardedIp) {
        return firstForwardedIp;
      }
    }

    return client.handshake.address;
  }

  private recordMessageReceived(client: Socket): void {
    const tracked = this.connectedClients.get(client.id);
    if (tracked) {
      tracked.lastMessageReceivedAt = new Date();
    }
  }

  private recordMessageSent(): void {
    const now = new Date();
    for (const tracked of this.connectedClients.values()) {
      tracked.lastMessageSentAt = now;
    }
  }

  getConnectedClients(): BridgeClientConnectionDto[] {
    const now = Date.now();
    return Array.from(this.connectedClients.values())
      .map((c) => ({
        clientId: c.clientId,
        clientIpAddress: c.clientIpAddress,
        status: c.status,
        oauthClientId: c.oauthClientId,
        connectedAt: c.connectedAt.toISOString(),
        lastMessageReceivedAt: c.lastMessageReceivedAt?.toISOString(),
        lastMessageSentAt: c.lastMessageSentAt?.toISOString(),
        disconnectedAt: c.disconnectedAt?.toISOString(),
        uptimeMs: c.status === "connected" ? now - c.connectedAt.getTime() : 0
      }))
      .sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
  }

  pushAlgorithmInstance(body: BridgePushAlgorithmInstanceDto): void {
    this.server.emit("server.algorithm-instances", body);
    this.recordMessageSent();
  }

  pushStartAlgorithmInstance(body: BridgeStartAlgorithmInstanceDto): void {
    this.server.emit("server.algorithm-instances.start", body);
    this.recordMessageSent();
  }

  pushDeleteAlgorithmInstance(body: BridgeDeleteAlgorithmInstanceDto): void {
    this.server.emit("server.algorithm-instances.delete", body);
    this.recordMessageSent();
  }

  pushAlgorithmEventCreated(body: BridgePushAlgorithmEventDto): void {
    this.server.emit("server.algorithm-events.created", body);
    this.recordMessageSent();
  }

  pushAlgorithmEventData(body: BridgePushAlgorithmEventDataDto): void {
    this.server.emit("server.algorithm-events.upload-data", body);
    this.recordMessageSent();
  }

  @SubscribeMessage("client.datasets.upsert")
  async clientUpsertDatasets(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BridgeUpsertDatasetsDto
  ): Promise<{ ok: true }> {
    this.recordMessageReceived(client);
    this.logger.log(
      `Received upsert dataset via bridge WS: ${body.dataset["@id"]}`
    );
    await this.bridge.clientUpsertDatasets(body);
    return { ok: true };
  }

  @SubscribeMessage("client.datasets.delete")
  async clientDeleteDatasets(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BridgeDeleteDatasetsDto
  ): Promise<{ ok: true }> {
    this.recordMessageReceived(client);
    this.logger.log(`Received delete dataset via bridge WS: ${body.datasetId}`);
    await this.bridge.clientDeleteDatasets(body);
    return { ok: true };
  }

  @SubscribeMessage("client.job.status")
  async clientPushJobStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BridgeJobStatusUpdateDto
  ): Promise<{ ok: true }> {
    this.recordMessageReceived(client);
    this.logger.log(
      `Received job status update via bridge WS: ${body.algorithmInstanceId} (${body.jobName}) -> ${body.status}`
    );
    await this.bridge.clientPushJobStatus(body);
    return { ok: true };
  }

  @SubscribeMessage("client.algorithm-events.create")
  async clientCreateAlgorithmEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BridgeCreateAlgorithmEventDto
  ) {
    this.recordMessageReceived(client);
    this.logger.log(
      `Received algorithm event creation via bridge WS: ${body.algorithmInstanceId} (eventId: ${body.event.eventId})`
    );
    return await this.bridge.clientCreateAlgorithmEvent(body);
  }

  @SubscribeMessage("client.algorithm-events.upload-data")
  async clientUploadAlgorithmEventData(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      algorithmInstanceId: string;
      eventId: string;
      eventData?: Buffer;
    }
  ): Promise<{ ok: true }> {
    this.recordMessageReceived(client);
    this.logger.log(
      `Received algorithm event data upload for ${body.eventId}, data present: ${!!body.eventData}, data type: ${typeof body.eventData}, data length: ${body.eventData?.length ?? 0}`
    );

    // Socket.IO may deliver binary as Uint8Array or ArrayBuffer, convert to Buffer if needed
    let eventData = body.eventData;
    if (eventData && !(eventData instanceof Buffer)) {
      this.logger.debug(
        `Converting eventData from ${eventData.constructor?.name ?? typeof eventData} to Buffer`
      );
      eventData = Buffer.from(eventData as unknown as ArrayBuffer);
    }

    await this.bridge.clientUploadAlgorithmEventData({
      algorithmInstanceId: body.algorithmInstanceId,
      eventId: body.eventId,
      eventData
    });
    return { ok: true };
  }

  @SubscribeMessage("client.algorithm-events.upload-data-chunk")
  async clientUploadAlgorithmEventDataChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() chunk: BridgeAlgorithmEventDataChunkDto
  ): Promise<{ ok: true; assembled?: boolean }> {
    this.recordMessageReceived(client);
    const {
      transferId,
      algorithmInstanceId,
      eventId,
      chunkIndex,
      totalChunks,
      totalSize,
      chunkData
    } = chunk;

    this.logger.debug(
      `Received chunk ${chunkIndex + 1}/${totalChunks} for transfer ${transferId}`
    );

    // Get or create buffer for this transfer
    let buffer = this.chunkBuffers.get(transferId);
    if (!buffer) {
      buffer = {
        algorithmInstanceId,
        eventId,
        totalChunks,
        totalSize,
        receivedChunks: new Map(),
        createdAt: new Date()
      };
      this.chunkBuffers.set(transferId, buffer);
    }

    // Store the chunk
    if (chunkData) {
      buffer.receivedChunks.set(chunkIndex, Buffer.from(chunkData));
    }

    // Check if all chunks received
    if (buffer.receivedChunks.size === buffer.totalChunks) {
      try {
        // Assemble the complete data
        const eventData = this.assembleChunks(buffer);

        this.logger.log(
          `Assembled ${eventData.length} bytes from ${buffer.totalChunks} chunks for transfer ${transferId}`
        );

        // Process the complete event data
        await this.bridge.clientUploadAlgorithmEventData({
          algorithmInstanceId: buffer.algorithmInstanceId,
          eventId: buffer.eventId,
          eventData
        });

        // Clean up
        this.chunkBuffers.delete(transferId);

        return { ok: true, assembled: true };
      } catch (error) {
        this.logger.error(
          `Failed to assemble/process chunks for transfer ${transferId}: ${error}`
        );
        this.chunkBuffers.delete(transferId);
        throw error;
      }
    }

    return { ok: true, assembled: false };
  }

  private assembleChunks(buffer: ChunkBuffer): Buffer {
    const chunks: Buffer[] = [];
    for (let i = 0; i < buffer.totalChunks; i++) {
      const chunk = buffer.receivedChunks.get(i);
      if (!chunk) {
        throw new Error(`Missing chunk ${i} in transfer`);
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private cleanupStaleBuffers(): void {
    const now = Date.now();
    for (const [transferId, buffer] of this.chunkBuffers.entries()) {
      if (now - buffer.createdAt.getTime() > this.chunkTimeout) {
        this.logger.warn(
          `Cleaning up stale chunk buffer ${transferId} (${buffer.receivedChunks.size}/${buffer.totalChunks} chunks)`
        );
        this.chunkBuffers.delete(transferId);
      }
    }
  }
}
