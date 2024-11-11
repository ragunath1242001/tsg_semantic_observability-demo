import { CatalogService } from "@apps/control-plane-api/src/dsp/catalog/catalog.service";
import { NegotiationService } from "@apps/control-plane-api/src/dsp/negotiation/negotiation.service";
import { TransferService } from "@apps/control-plane-api/src/dsp/transfer/transfer.service";
import {
  DatasetDto,
  deserialize,
  dspContextUrl,
  NegotiationDetail,
  TransferDetail,
  tsgContextUrl
} from "@tsg-dsp/common-dsp";

export type Events =
  | "negotiation:create"
  | "negotiation:update"
  | "transfer:create"
  | "transfer:update";

export abstract class Pipeline {
  constructor(
    readonly id: string,
    readonly catalogService: CatalogService,
    readonly negotiationService: NegotiationService,
    readonly transferService: TransferService
  ) {}
  datasetDto: DatasetDto = {
    "@context": [dspContextUrl, tsgContextUrl()],
    "@type": "dcat:Dataset",
    "@id": this.id,
    "dcat:distribution": [
      {
        "@type": "dcat:Distribution",
        "@id": `${this.id}-dataset`
      }
    ],
    "odrl:hasPolicy": [
      {
        "@type": "odrl:Offer",
        "@id": `CD123:${this.id}:456`,
        "odrl:permission": [
          {
            "@type": "odrl:Permission",
            "odrl:action": "odrl:use"
          }
        ]
      }
    ]
  };

  resolveCompleted: ((v: unknown) => void) | undefined;
  completed = new Promise((resolve) => {
    this.resolveCompleted = resolve;
  });

  complete() {
    setTimeout(this.resolveCompleted!, 100);
  }

  async init() {
    await this.catalogService.addDataset(await deserialize(this.datasetDto));
  }

  async onNegotiationEvent(
    event: Events,
    negotiation: NegotiationDetail
  ): Promise<any> {
    switch (event) {
      case "negotiation:create":
        if (negotiation.role === "provider") {
          return await this.onProviderNegotiationCreate(negotiation);
        } else {
          return await this.onConsumerNegotiationCreate(negotiation);
        }
      case "negotiation:update":
        if (negotiation.role === "provider") {
          return await this.onProviderNegotiationUpdate(negotiation);
        } else {
          return await this.onConsumerNegotiationUpdate(negotiation);
        }
    }
  }

  async onTransferEvent(event: Events, transfer: TransferDetail): Promise<any> {
    switch (event) {
      case "transfer:create":
        if (transfer.role === "provider") {
          return await this.onProviderTransferCreate(transfer);
        } else {
          return await this.onConsumerTransferCreate(transfer);
        }
      case "transfer:update":
        if (transfer.role === "provider") {
          return await this.onProviderTransferUpdate(transfer);
        } else {
          return await this.onConsumerTransferUpdate(transfer);
        }
    }
  }

  async onProviderNegotiationCreate(
    negotiation: NegotiationDetail
  ): Promise<any> {}
  async onConsumerNegotiationCreate(
    negotiation: NegotiationDetail
  ): Promise<any> {}
  async onProviderNegotiationUpdate(
    negotiation: NegotiationDetail
  ): Promise<any> {}
  async onConsumerNegotiationUpdate(
    negotiation: NegotiationDetail
  ): Promise<any> {}
  async onProviderTransferCreate(transfer: TransferDetail): Promise<any> {}
  async onConsumerTransferCreate(transfer: TransferDetail): Promise<any> {}
  async onProviderTransferUpdate(transfer: TransferDetail): Promise<any> {}
  async onConsumerTransferUpdate(transfer: TransferDetail): Promise<any> {}
}
