import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type {
  BridgeDeleteAlgorithmInstanceDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto,
  BridgePushAlgorithmInstanceDto,
  BridgeStartAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";

import { SplitModeService } from "../split-mode/split-mode.service.js";
import { BridgeWsClientService } from "./bridge-ws-client.service.js";

export interface AlgorithmInstanceBridgeHandler {
  upsertAlgorithmInstancesFromBridge(
    instances: BridgePushAlgorithmInstanceDto["algorithmInstance"][]
  ): Promise<void>;
  deleteAlgorithmInstanceFromBridge(algorithmInstanceId: string): Promise<void>;
  startAlgorithmInstance(params: {
    algorithmInstanceId: string;
    isInitiator: boolean;
    authorizationHeader: string | undefined;
  }): Promise<void>;
}

export interface AlgorithmEventBridgeHandler {
  upsertRemoteAlgorithmEventFromBridge(
    body: BridgePushAlgorithmEventDto
  ): Promise<void>;
  applyRemoteAlgorithmEventDataFromBridge(
    body: BridgePushAlgorithmEventDataDto
  ): Promise<void>;
}

@Injectable()
export class BridgeWsClientListeners implements OnModuleInit {
  private readonly logger = new Logger(this.constructor.name);

  private algorithmInstanceHandler?: AlgorithmInstanceBridgeHandler;
  private algorithmEventHandler?: AlgorithmEventBridgeHandler;

  constructor(
    private readonly splitMode: SplitModeService,
    private readonly bridgeWs: BridgeWsClientService
  ) {}

  setAlgorithmInstanceHandler(handler: AlgorithmInstanceBridgeHandler): void {
    this.algorithmInstanceHandler = handler;
  }

  setAlgorithmEventHandler(handler: AlgorithmEventBridgeHandler): void {
    this.algorithmEventHandler = handler;
  }

  onModuleInit(): void {
    if (!this.splitMode.isClientMode) {
      return;
    }

    this.registerAlgorithmInstanceListeners();
    this.registerAlgorithmEventListeners();
  }

  private registerAlgorithmInstanceListeners(): void {
    this.bridgeWs.on(
      "server.algorithm-instances",
      async (body: BridgePushAlgorithmInstanceDto) => {
        if (!this.algorithmInstanceHandler) {
          this.logger.warn(
            "Received algorithm instance but handler not registered"
          );
          return;
        }

        const reason = body.reason ? ` (${body.reason})` : "";
        this.logger.log(
          `Received algorithm instance ${body.algorithmInstance.id} from server via bridge WS${reason}`
        );
        await this.algorithmInstanceHandler.upsertAlgorithmInstancesFromBridge([
          body.algorithmInstance
        ]);
      }
    );

    this.bridgeWs.on(
      "server.algorithm-instances.delete",
      async (body: BridgeDeleteAlgorithmInstanceDto) => {
        if (!this.algorithmInstanceHandler) {
          this.logger.warn(
            "Received algorithm instance delete but handler not registered"
          );
          return;
        }

        this.logger.log(
          `Received delete for algorithm instance ${body.algorithmInstanceId} from server via bridge WS`
        );
        await this.algorithmInstanceHandler.deleteAlgorithmInstanceFromBridge(
          body.algorithmInstanceId
        );
      }
    );

    this.bridgeWs.on(
      "server.algorithm-instances.start",
      async (body: BridgeStartAlgorithmInstanceDto) => {
        if (!this.algorithmInstanceHandler) {
          this.logger.warn("Received start command but handler not registered");
          return;
        }

        this.logger.log(
          `Received start request for algorithm instance ${body.algorithmInstanceId} via bridge WS`
        );
        await this.algorithmInstanceHandler.startAlgorithmInstance({
          algorithmInstanceId: body.algorithmInstanceId,
          isInitiator: true,
          authorizationHeader: undefined
        });
      }
    );
  }

  private registerAlgorithmEventListeners(): void {
    this.bridgeWs.on(
      "server.algorithm-events.created",
      async (body: BridgePushAlgorithmEventDto) => {
        if (!this.algorithmEventHandler) {
          this.logger.warn(
            "Received algorithm event but handler not registered"
          );
          return;
        }

        this.logger.log(
          `Received algorithm event ${body.event.eventId} for instance ${body.algorithmInstanceId} from server via bridge WS`
        );
        await this.algorithmEventHandler.upsertRemoteAlgorithmEventFromBridge(
          body
        );
      }
    );

    this.bridgeWs.on(
      "server.algorithm-events.upload-data",
      async (body: BridgePushAlgorithmEventDataDto) => {
        if (!this.algorithmEventHandler) {
          this.logger.warn(
            "Received algorithm event data but handler not registered"
          );
          return;
        }

        this.logger.log(
          `Received algorithm event data for ${body.eventId} (instance ${body.algorithmInstanceId}) via bridge WS`
        );
        await this.algorithmEventHandler.applyRemoteAlgorithmEventDataFromBridge(
          body
        );
      }
    );
  }
}
