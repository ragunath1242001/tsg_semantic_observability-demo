import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../../auth/auth.module";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";
import { CatalogManagementController } from "./catalogManagement.controller";
import { DspClientModule } from "../client/client.module";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../../model/catalog.dao";

@Module({
  imports: [
    AuthModule,
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
