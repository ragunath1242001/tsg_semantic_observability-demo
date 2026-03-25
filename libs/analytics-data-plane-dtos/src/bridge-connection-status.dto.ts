import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BridgeClientConnectionDto {
  @ApiProperty({ description: "Socket.IO client ID" })
  clientId!: string;

  @ApiPropertyOptional({
    description: "Client IP address observed during the WebSocket handshake"
  })
  clientIpAddress?: string;

  @ApiProperty({
    description: "WebSocket connection status",
    enum: ["connected", "disconnected"]
  })
  status!: "connected" | "disconnected";

  @ApiPropertyOptional({
    description: "OAuth client_id used for this connection"
  })
  oauthClientId?: string;

  @ApiProperty({ description: "When the connection was established" })
  connectedAt!: string;

  @ApiPropertyOptional({ description: "When the connection was lost" })
  disconnectedAt?: string;

  @ApiPropertyOptional({
    description: "When the last message was received from this client"
  })
  lastMessageReceivedAt?: string;

  @ApiPropertyOptional({
    description: "When the last message was sent to this client"
  })
  lastMessageSentAt?: string;

  @ApiProperty({ description: "Connection uptime in milliseconds" })
  uptimeMs!: number;
}

export class BridgeServerConnectionStatusDto {
  @ApiProperty({
    description: "Runtime mode of this instance",
    enum: ["server", "standalone"]
  })
  mode!: string;

  @ApiProperty({
    description: "Connected bridge clients",
    type: [BridgeClientConnectionDto]
  })
  clients!: BridgeClientConnectionDto[];
}

export class BridgeClientConnectionStatusDto {
  @ApiProperty({
    description: "Runtime mode of this instance",
    enum: ["client"]
  })
  mode!: string;

  @ApiProperty({
    description: "WebSocket connection status",
    enum: ["connected", "disconnected", "not-configured"]
  })
  status!: "connected" | "disconnected" | "not-configured";

  @ApiPropertyOptional({
    description: "OAuth client_id used for server connection"
  })
  oauthClientId?: string;

  @ApiPropertyOptional({ description: "Bridge server URL" })
  serverUrl?: string;

  @ApiPropertyOptional({ description: "When the connection was established" })
  connectedAt?: string;

  @ApiPropertyOptional({
    description: "When the last message was received from the server"
  })
  lastMessageReceivedAt?: string;

  @ApiPropertyOptional({
    description: "When the last message was sent to the server"
  })
  lastMessageSentAt?: string;

  @ApiPropertyOptional({ description: "When the connection was lost" })
  disconnectedAt?: string;

  @ApiPropertyOptional({
    description: "Whether the client is currently reconnecting"
  })
  reconnecting?: boolean;

  @ApiPropertyOptional({ description: "Number of reconnect attempts made" })
  reconnectAttempts?: number;

  @ApiPropertyOptional({ description: "Connection uptime in milliseconds" })
  uptimeMs?: number;
}
