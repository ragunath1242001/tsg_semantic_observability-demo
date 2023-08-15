import { Module } from "@nestjs/common";
import { CatalogService } from "./dsp/catalog.service";
import { NegotiationService } from "./dsp/negotiation.service";
import { DataPlaneService } from "./dataPlane.service";
import { DspClientService } from "./dsp/client.service";


@Module({
  providers: [
    DspClientService,
    CatalogService,
    NegotiationService,
    DataPlaneService,
  ],
  exports: [
    DspClientService,
    CatalogService,
    NegotiationService,
    DataPlaneService,
  ]
})
export class ServicesModule {}