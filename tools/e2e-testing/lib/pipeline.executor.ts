import {
  CatalogService,
  DataPlaneService,
  NegotiationService,
  TransferService
} from "@apps/control-plane-api";
import { Logger } from "@nestjs/common";
import { io, Socket } from "socket.io-client";

import { Pipeline } from "./pipeline.js";
import { PipelineExecute } from "./types.js";

export class PipelineExecutor {
  constructor(
    private readonly port: number,
    public readonly catalogService: CatalogService,
    public readonly negotiationService: NegotiationService,
    public readonly transferService: TransferService,
    public readonly dataPlaneService: DataPlaneService
  ) {}
  private socket: Socket | undefined;
  private readonly logger = new Logger(this.constructor.name);

  pipelines: { [identifier: string]: Pipeline } = {};

  close() {
    this.socket?.close();
  }

  newPipeline(
    id: string,
    agreementId?: string,
    assigner?: string,
    assignee?: string
  ): PipelineExecute {
    const pipeline = new Pipeline(
      id,
      agreementId,
      assigner,
      assignee,
      this.catalogService,
      this.negotiationService,
      this.transferService,
      this.dataPlaneService
    );
    this.pipelines[agreementId ?? id] = pipeline;
    return pipeline;
  }

  async initWebsocket() {
    this.socket = io(`http://localhost:${this.port}`);
    this.socket.onAny((event, data) => {
      if (event === "connect") {
        this.logger.log("Websocket connected to server");
        return;
      }
      new Promise((resolve) => setTimeout(resolve, 50)).then(async () => {
        switch (event) {
          case "negotiation:create":
          case "negotiation:update": {
            const negotiation =
              await this.negotiationService.getNegotiation(data);
            this.logger.log(
              `Received event: ${event} - ${negotiation.id} - ${negotiation.state}`
            );
            await this.pipelines[negotiation.dataSet]?.handleNegotiationEvent(
              negotiation
            );
            break;
          }
          case "transfer:create":
          case "transfer:update": {
            const transfer = await this.transferService.getTransfer(data);
            this.logger.log(
              `Received event: ${event} - ${transfer.id} - ${transfer.state}`
            );
            await this.pipelines[transfer.agreementId]?.handleTransferEvent(
              transfer
            );
          }
        }
      });
    });
  }

  async init() {
    await this.initWebsocket();
  }
}
