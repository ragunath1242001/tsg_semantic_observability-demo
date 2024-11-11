import { CatalogService } from "@apps/control-plane-api/src/dsp/catalog/catalog.service";
import { NegotiationService } from "@apps/control-plane-api/src/dsp/negotiation/negotiation.service";
import { io, Socket } from "socket.io-client";
import { Logger } from "@nestjs/common";
import { Events, Pipeline } from "./pipeline";
import { ACN0101 } from "./pipelines/ACN0101";
import { TransferService } from "@apps/control-plane-api/src/dsp/transfer/transfer.service";
import { ACN0102 } from "./pipelines/ACN0102";
import { ACN0103 } from "./pipelines/ACN0103";

export class PipelineExecutor {
  constructor(
    private readonly port: number,
    private readonly catalogService: CatalogService,
    private readonly negotiationService: NegotiationService,
    private readonly transferService: TransferService
  ) {}
  private socket: Socket | undefined;
  private readonly logger = new Logger(this.constructor.name);

  readonly pipelines: { [datasetId: string]: Pipeline } = {
    ACN0101: new ACN0101(
      "ACN0101",
      this.catalogService,
      this.negotiationService,
      this.transferService
    ),
    ACN0102: new ACN0102(
      "ACN0102",
      this.catalogService,
      this.negotiationService,
      this.transferService
    ),
    ACN0103: new ACN0103(
      "ACN0103",
      this.catalogService,
      this.negotiationService,
      this.transferService
    )
  };

  close() {
    this.socket?.close();
  }

  async initWebsocket() {
    this.socket = io(`http://localhost:${this.port}`);
    this.socket.onAny((event, data) => {
      if (event === "connect") {
        this.logger.log("Websocket connected to server");
        return;
      }
      this.logger.log(
        `Pipelines WS => Received event: ${event} - ${JSON.stringify(data)}`
      );
      new Promise((resolve) => setTimeout(resolve, 100)).then(async () => {
        switch (event) {
          case "negotiation:create":
          case "negotiation:update":
            const negotiation =
              await this.negotiationService.getNegotiation(data);
            await this.pipelines[negotiation.dataSet]?.onNegotiationEvent(
              event as Events,
              negotiation
            );
            break;
          case "transfer:create":
          case "transfer:update":
            throw new Error("Not implemented");
          // const transfer = await this.transferService.getTransfer(data);
          // this.pipelines[transfer.localId]?.onTransferEvent(event as Events, data);
        }
      });
    });
  }

  async init() {
    await this.initWebsocket();
    for (const pipeline of Object.values(this.pipelines)) {
      await pipeline.init();
    }
  }
}
