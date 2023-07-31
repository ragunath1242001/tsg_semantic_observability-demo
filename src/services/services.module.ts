import { Module } from "@nestjs/common";
import { CatalogService } from "./dsp/catalog.service";
import { NegotiationProviderService } from "./dsp/negotiationProvider.service";
import { NegotiationConsumerService } from "./dsp/negotiationConsumer.service";
import { TransferProviderService } from "./dsp/transferProvider.service";
import { TransferConsumerService } from "./dsp/transferConsumer.service";
import { DataPlaneService } from "./dataPlane.service";


@Module({
  providers: [
    CatalogService,
    NegotiationProviderService,
    NegotiationConsumerService,
    TransferProviderService,
    TransferConsumerService,
    DataPlaneService,
  ],
  exports: [
    CatalogService,
    NegotiationProviderService,
    NegotiationConsumerService,
    TransferProviderService,
    TransferConsumerService,
    DataPlaneService,
  ]
})
export class ServicesModule {}