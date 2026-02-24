import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { WsAuthMiddleware } from "@tsg-dsp/common-api";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  path: `${process.env["SUBPATH"] || ""}${process.env["EMBEDDED_FRONTEND"] ? "/api" : ""}/socket.io`,
  cors: {
    origin: [/http:\/\/localhost:\d+/]
  }
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);
  @WebSocketServer() server!: Server;

  constructor(private readonly wsAuth: WsAuthMiddleware) {}

  afterInit(server: Server) {
    server.use(this.wsAuth.createMiddleware());
    this.logger.log("Initialized events gateway");
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUpdateToClients(event: string, data: any) {
    try {
      this.logger.log(`Emitting event ${event} to clients`);
      this.server?.emit(event, data);
    } catch (err) {
      this.logger.error(`Failed to emit ${event}`, err as Error);
    }
  }
}
