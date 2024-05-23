import { DynamicModule, Module } from "@nestjs/common";
import { RegistryController } from "./registry.controller";
import { RegistryService } from "./registry.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CatalogDao,
  DataServiceDao,
  DatasetDao,
  ResourceDao,
} from "../model/catalog.dao";
import { ScheduleModule } from "@nestjs/schedule";
import { DidResolverService } from "./did.resolver.service";
import { AuthModule } from "../auth/auth.module";
import { DspClientModule } from "../dsp/client/client.module";
import { CatalogModule } from "../dsp/catalog/catalog.module";
import { RegistryClientController } from "./registry.client.controller";
import { RegistryClientService } from "./registry.client.service";
import { RegistryConfig } from "../config";

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
        ]),
        ScheduleModule.forRoot(),
      ],
      controllers: [RegistryClientController, RegistryController],
      providers: [DidResolverService, RegistryClientService, RegistryService],
      exports: [RegistryService],
    };
    return module;
  }
}
