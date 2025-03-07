import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DatasetDto } from "@tsg-dsp/common-dsp";

import { RuntimeConfig } from "../../config.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { TransferService } from "../transfer/transfer.service.js";
import {
  NegotiationCreatedEvent,
  NegotiationUpdatedEvent
} from "./negotiation.events.js";
import { NegotiationService } from "./negotiation.service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepSubset(obj1: any, obj2: any, excludedKeys: string[] = []) {
  // Check if both are objects, otherwise do a direct comparison
  if (typeof obj1 !== "object" || obj1 === null) {
    return obj1 === obj2;
  }

  // Ensure `obj2` has all properties of `obj1`
  for (const key in obj1) {
    if (excludedKeys.includes(key)) {
      continue;
    }

    if (!(key in obj2)) {
      return false;
    }

    // Recursive check for nested objects
    if (!deepSubset(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

@Injectable()
export class NegotiationListener {
  constructor(
    private readonly negotiationService: NegotiationService,
    private readonly transferService: TransferService,
    private readonly catalogService: CatalogService,
    private readonly runtimeConfig: RuntimeConfig
  ) {}

  logger = new Logger(this.constructor.name);

  async terminate(event: NegotiationCreatedEvent) {
    if (this.runtimeConfig.controlPlaneInteractions === "automatic") {
      this.logger.log(`Terminating contract negotiation for ${event.localId}.`);
      await this.negotiationService.terminate(event.localId);
    }
  }

  @OnEvent("negotiation.create", { promisify: true })
  async handleNegotiationCreatedEvent(event: NegotiationCreatedEvent) {
    let dataset: DatasetDto | null;
    try {
      dataset = (
        await this.catalogService.getDataset(event.datasetId)
      ).serialize();
    } catch (err) {
      dataset = null;
      this.logger.error("Error fetching dataset", err);
    }
    const datasetPolicy = dataset?.["odrl:hasPolicy"]?.[0];
    if (!datasetPolicy) {
      this.logger.error(`No policy in dataset with id ${event.datasetId}`);
      this.terminate(event);

      return;
    }
    if (!datasetPolicy["odrl:target"]) {
      datasetPolicy["odrl:target"] = dataset?.["@id"];
    }
    datasetPolicy["odrl:assignee"] = event.remoteParty;

    const offerIncludedInPolicy = deepSubset(datasetPolicy, event.offer, [
      "@id",
      "@context"
    ]);

    if (offerIncludedInPolicy) {
      await this.negotiationService.agree(event.localId);
    } else {
      this.terminate(event);
    }
  }

  @OnEvent("negotiation.agree", { promisify: true })
  async handleNegotiationAgreedEvent(event: NegotiationUpdatedEvent) {
    await this.negotiationService.verify(event.processId);
  }

  @OnEvent("negotiation.verify", { promisify: true })
  async handleNegotiationVerifiedEvent(event: NegotiationUpdatedEvent) {
    await this.negotiationService.finalize(event.processId);
  }
}
