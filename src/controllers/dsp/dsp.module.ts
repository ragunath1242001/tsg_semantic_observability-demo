import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "../../services/catalog.service";
import { NegotiationController } from "./negotiation.controller";
import { NegotiationProviderService } from "../../services/negotiationProvider.service";
import { NegotiationConsumerService } from "../../services/negotiationConsumer.service";
import { TransferController } from "./transfer.controller";
import { TransferProviderService } from "../../services/transferProvider.service";
import { TransferConsumerService } from "../../services/transferConsumer.service";

@Module({
  imports: [],
  controllers: [CatalogController, NegotiationController, TransferController],
  providers: [
    CatalogService,
    NegotiationProviderService,
    NegotiationConsumerService,
    TransferProviderService,
    TransferConsumerService,
  ],
})
export class DspModule {}
