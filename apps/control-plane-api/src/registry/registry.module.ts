import { DynamicModule, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { CatalogModule } from "../dsp/catalog/catalog.module.js";
import { DspClientModule } from "../dsp/client/client.module.js";
import {
  CatalogDao,
  DataServiceDao,
  DatasetDao,
  ResourceDao
} from "../model/catalog.dao.js";
import { RegistryDao } from "../model/registry.dao.js";
import { VCAuthModule } from "../vc-auth/vc.auth.module.js";
import { RegistryClientService } from "./registry.client.service.js";
import { RegistryController } from "./registry.controller.js";
import { RegistryService } from "./registry.service.js";
import { RegistryManagementController } from "./registryManagement.controller.js";

@Module({})
export class RegistryModule {
  static register(): DynamicModule {
    const module: DynamicModule = {
      module: RegistryModule,
      imports: [
        AuthModule,
        VCAuthModule,
        DspClientModule,
        CatalogModule,
        TypeOrmModule.forFeature([
          CatalogDao,
          DatasetDao,
          DataServiceDao,
          ResourceDao,
          RegistryDao
        ]),
        ScheduleModule.forRoot()
      ],
      controllers: [RegistryManagementController, RegistryController],
      providers: [RegistryClientService, RegistryService],
      exports: [RegistryService]
    };
    return module;
  }
}
