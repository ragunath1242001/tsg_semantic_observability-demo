import { Module } from "@nestjs/common";
import { RegistryController } from "./registry.controller";
import { RegistryService } from "./registry.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CatalogDao,
  DataServiceDao,
  DatasetDao,
  ResourceDao,
} from "../model/dsp/catalog/catalog.dao";
import { ScheduleModule } from "@nestjs/schedule";
import { DidResolverService } from "./did.resolver.service";
import { RegistryWalletClient } from "./registry.wallet";
import { AuthModule } from "../auth/auth.module";
import { DspClientModule } from "../dsp/client/client.module";
import { CatalogModule } from "../dsp/catalog/catalog.module";

@Module({
  imports: [
    AuthModule,
    DspClientModule,
    CatalogModule,
    TypeOrmModule.forFeature([
      CatalogDao,
      DatasetDao,
      DataServiceDao,
      ResourceDao,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [RegistryController],
  providers: [DidResolverService, RegistryWalletClient, RegistryService],
})
export class RegistryModule {}
