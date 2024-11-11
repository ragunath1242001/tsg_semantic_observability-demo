import {
  ContractNegotiationState,
  NegotiationDetail
} from "@tsg-dsp/common-dsp";
import { Pipeline } from "../pipeline";

export class ACN0103 extends Pipeline {
  async onProviderNegotiationCreate(negotiation: NegotiationDetail) {
    await this.negotiationService.agree(negotiation.localId);
  }

  async onConsumerNegotiationUpdate(
    negotiation: NegotiationDetail
  ): Promise<any> {
    if (negotiation.state === ContractNegotiationState.AGREED) {
      await this.negotiationService.verify(negotiation.localId);
    }
  }

  async onProviderNegotiationUpdate(
    negotiation: NegotiationDetail
  ): Promise<any> {
    if (negotiation.state === ContractNegotiationState.VERIFIED) {
      await this.negotiationService.finalize(negotiation.localId);
      this.complete();
    }
  }
}
