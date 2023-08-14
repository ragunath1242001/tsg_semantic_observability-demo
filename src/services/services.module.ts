import { Module } from "@nestjs/common";
import { CatalogService } from "./dsp/catalog.service";
import { NegotiationProviderService } from "./dsp/negotiationProvider.service";
import { NegotiationConsumerService } from "./dsp/negotiationConsumer.service";
import { DataPlaneService } from "./dataPlane.service";
import { DspClientService } from "./dsp/client.service";


@Module({
  providers: [
    DspClientService,
    CatalogService,
    NegotiationProviderService,
    NegotiationConsumerService,
    DataPlaneService,
  ],
  exports: [
    DspClientService,
    CatalogService,
    NegotiationProviderService,
    NegotiationConsumerService,
    DataPlaneService,
  ]
})
export class ServicesModule {}