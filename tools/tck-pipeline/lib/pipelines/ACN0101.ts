import { NegotiationDetail } from "@tsg-dsp/common-dsp";
import { Pipeline } from "../pipeline";

export class ACN0101 extends Pipeline {
  async onProviderNegotiationCreate(negotiation: NegotiationDetail) {
    await this.negotiationService.agree(negotiation.localId);
    this.complete();
  }
}
