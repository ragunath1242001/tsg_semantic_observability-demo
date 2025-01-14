import { DynamicModule, Module } from "@nestjs/common";
import { RegistryController } from "./registry.controller.js";
import { RegistryService } from "./registry.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CatalogDao,
  DataServiceDao,
  DatasetDao,
  ResourceDao
} from "../model/catalog.dao.js";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "../auth/auth.module.js";
import { DspClientModule } from "../dsp/client/client.module.js";
import { CatalogModule } from "../dsp/catalog/catalog.module.js";
import { RegistryClientController } from "./registry.client.controller.js";
import { RegistryClientService } from "./registry.client.service.js";
import { RegistryConfig } from "../config.js";
import { RegistryDao } from "../model/registry.dao.js";

@Module({})
export class RegistryModule {
  static register(registryConfig: RegistryConfig): DynamicModule {
    const module: DynamicModule = {
      module: RegistryModule,
      imports: [
        AuthModule,
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
      controllers: [RegistryClientController, RegistryController],
      providers: [RegistryClientService, RegistryService],
      exports: [RegistryService]
    };
    return module;
  }
}
