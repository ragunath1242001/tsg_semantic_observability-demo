import { OfferDto } from "@tsg-dsp/common-dsp";

export class NegotiationCreatedEvent {
  id: string;
  offer: OfferDto;
  datasetId: string;
  remoteParty: string;

  constructor(value: NegotiationCreatedEvent) {
    this.id = value.id;
    this.offer = value.offer;
    this.datasetId = value.datasetId;
    this.remoteParty = value.remoteParty;
  }
}

export class NegotiationUpdatedEvent {
  processId: string;

  constructor(value: NegotiationUpdatedEvent) {
    this.processId = value.processId;
  }
}

export class NegotiationFinalizedEvent {
  processId: string;
  audience: string;

  constructor(value: NegotiationFinalizedEvent) {
    this.processId = value.processId;
    this.audience = value.audience;
  }
}
