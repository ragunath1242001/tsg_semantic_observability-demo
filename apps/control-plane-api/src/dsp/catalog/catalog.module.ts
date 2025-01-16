import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VCAuthModule } from "../../vc-auth/vc.auth.module.js";
import { CatalogService } from "./catalog.service.js";
import { CatalogController } from "./catalog.controller.js";
import { CatalogManagementController } from "./catalogManagement.controller.js";
import { DspClientModule } from "../client/client.module.js";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../../model/catalog.dao.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../../config.js";

@Module({
  imports: [
    AuthModule.register(RootConfig),
    VCAuthModule,
    DspClientModule,
    TypeOrmModule.forFeature([
      CatalogDao,
      DatasetDao,
      DataServiceDao,
      DistributionDao,
      ResourceDao,
      CatalogRecordDao
    ])
  ],
  controllers: [CatalogController, CatalogManagementController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
