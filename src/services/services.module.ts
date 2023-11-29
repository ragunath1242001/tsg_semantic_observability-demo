import { Module } from "@nestjs/common";
import { CatalogService } from "./dsp/catalog.service";
import { NegotiationService } from "./dsp/negotiation.service";
import { DataPlaneService } from "./dataPlane.service";
import { DspClientService } from "./dsp/client.service";
import { TransferService } from "./dsp/transfer.service";
import { AuthModule } from "../auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ResourceDao, DataServiceDao, DistributionDao, DatasetDao, CatalogRecordDao, CatalogDao } from "../model/dsp/catalog/catalog.dao";


@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ResourceDao, DataServiceDao, DistributionDao, DatasetDao, CatalogRecordDao, CatalogDao]),
  ],
  providers: [
    DspClientService,
    CatalogService,
    NegotiationService,
    TransferService,
    DataPlaneService,
  ],
  exports: [
    DspClientService,
    CatalogService,
    NegotiationService,
    TransferService,
    DataPlaneService,
  ]
})
export class ServicesModule {}