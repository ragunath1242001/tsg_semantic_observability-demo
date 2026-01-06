import { Injectable } from "@nestjs/common";
import {
  BridgeAlgorithmInstanceMetadataDto,
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto,
  BridgePushAlgorithmInstanceDto,
  BridgeStartAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";

import { RootConfig } from "../../config.js";
import { BridgeWsGateway } from "./bridge-ws.gateway.js";

@Injectable()
export class BridgeWsPublisherService {
  constructor(
    private readonly config: RootConfig,
    private readonly gateway: BridgeWsGateway
  ) {}

  pushAlgorithmInstance(
    algorithmInstance: BridgeAlgorithmInstanceMetadataDto,
    reason?: BridgePushAlgorithmInstanceDto["reason"]
  ): void {
    if (this.config.split.mode !== "server") {
      return;
    }

    const body: BridgePushAlgorithmInstanceDto = {
      algorithmInstance,
      reason
    };
    this.gateway.pushAlgorithmInstance(body);
  }

  pushStartAlgorithmInstance(
    algorithmInstanceId: string,
    requestedAt?: Date
  ): void {
    if (this.config.split.mode !== "server") {
      return;
    }

    const body: BridgeStartAlgorithmInstanceDto = {
      algorithmInstanceId,
      requestedAt
    };
    this.gateway.pushStartAlgorithmInstance(body);
  }

  pushAlgorithmEventCreated(body: BridgePushAlgorithmEventDto): void {
    if (this.config.split.mode !== "server") {
      return;
    }

    this.gateway.pushAlgorithmEventCreated(body);
  }

  pushAlgorithmEventData(body: BridgePushAlgorithmEventDataDto): void {
    if (this.config.split.mode !== "server") {
      return;
    }

    this.gateway.pushAlgorithmEventData(body);
  }
}
