import {
  ContractNegotiationState,
  NegotiationDetail
} from "@tsg-dsp/common-dsp";
import { Pipeline } from "../pipeline";

export class ACN0102 extends Pipeline {
  async onProviderNegotiationCreate(negotiation: NegotiationDetail) {
    await this.negotiationService.agree(negotiation.localId);
  }

  async onConsumerNegotiationUpdate(
    negotiation: NegotiationDetail
  ): Promise<any> {
    if (negotiation.state === ContractNegotiationState.AGREED) {
      await this.negotiationService.verify(negotiation.localId);
      this.complete();
    }
  }
}
