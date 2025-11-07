import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DataPlaneStateDao } from "../dao/dataplane-state.dao.js";
import { CatalogClientService } from "../services/catalog-client.service.js";
import { DataPlaneRegistrationService } from "../services/dataplane-registration.service.js";
import { NegotiationClientService } from "../services/negotiation-client.service.js";
import { TransferClientService } from "../services/transfer-client.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([DataPlaneStateDao]), AuthModule],
  providers: [
    CatalogClientService,
    DataPlaneRegistrationService,
    NegotiationClientService,
    TransferClientService
  ],
  exports: [
    CatalogClientService,
    DataPlaneRegistrationService,
    NegotiationClientService,
    TransferClientService
  ]
})
export class CommonDataPlaneModule {}
