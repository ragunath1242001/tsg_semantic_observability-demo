import { Body, Controller, Logger, Post } from "@nestjs/common";

interface NegotiationSignal {
  providerId: string;
  offerId: string;
  datasetId: string;
  connectorAddress: string;
}
interface TransferSignal {
  providerId: string;
  agreementId: string;
  format: string;
  connectorAddress: string;
}

@Controller("signal")
export class SignalController {
  private readonly logger = new Logger(this.constructor.name);
  private negotiationResolvers: Record<
    string,
    (value: NegotiationSignal) => void
  > = {};

  waitForNegotiationSignal(id: string): Promise<NegotiationSignal> {
    return new Promise((resolve) => {
      this.negotiationResolvers[id] = resolve;
    });
  }
  private transferResolvers: Record<string, (value: TransferSignal) => void> =
    {};

  waitForTransferSignal(id: string): Promise<TransferSignal> {
    return new Promise((resolve) => {
      this.transferResolvers[id] = resolve;
    });
  }

  @Post("negotiation")
  async negotiationSignal(
    @Body() negotiationSignal: NegotiationSignal
  ): Promise<void> {
    this.logger.log(`Received signal: ${JSON.stringify(negotiationSignal)}`);
    const resolver = this.negotiationResolvers[negotiationSignal.datasetId];
    if (resolver) {
      resolver(negotiationSignal);
      delete this.negotiationResolvers[negotiationSignal.datasetId];
    } else {
      this.logger.warn(
        `No resolver found for datasetId ${negotiationSignal.datasetId}`
      );
    }
  }
  @Post("transfer")
  async transferSignal(@Body() transferSignal: TransferSignal): Promise<void> {
    this.logger.log(`Received signal: ${JSON.stringify(transferSignal)}`);
    const resolver = this.transferResolvers[transferSignal.agreementId];
    if (resolver) {
      resolver(transferSignal);
      delete this.transferResolvers[transferSignal.agreementId];
    } else {
      this.logger.warn(
        `No resolver found for agreementId ${transferSignal.agreementId}`
      );
    }
  }
}
