import { DynamicModule, Logger, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DirectPresentationController } from "./direct/presentation.controller.js";
import { PresentationService } from "./presentation.service.js";
import { CredentialsModule } from "../credentials/credentials.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { DidModule } from "../did/did.module.js";
import { PresentationConfig, PresentationType } from "../config.js";
import { IatpHolderController } from "./iatp/holder.controller.js";
import { IatpVerifierController } from "./iatp/verifier.controller.js";
import { IatpVerifierService } from "./iatp/verifier.service.js";
import { IatpSiopService } from "./iatp/siop.service.js";
import { SIToken } from "../model/iatp.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IatpHolderService } from "./iatp/holder.service.js";

@Module({})
export class PresentationModule {
  static register(presentationConfig: PresentationConfig): DynamicModule {
    const module: DynamicModule = {
      module: PresentationModule,
      imports: [AuthModule, CredentialsModule, KeysModule, DidModule],
      global: true,
      controllers: [],
      providers: [PresentationService],
      exports: [PresentationService],
    };

    for (const type of presentationConfig.types) {
      switch (type) {
        case PresentationType.DIRECT:
          module.controllers = [
            ...(module.controllers ?? []),
            DirectPresentationController,
          ];
          break;
        case PresentationType.IATP:
          module.imports = [
            ...(module.imports ?? []),
            TypeOrmModule.forFeature([SIToken]),
          ];
          module.controllers = [
            ...(module.controllers ?? []),
            IatpHolderController,
            IatpVerifierController,
          ];
          module.providers = [
            ...(module.providers ?? []),
            IatpSiopService,
            IatpHolderService,
            IatpVerifierService,
          ];
          module.exports = [
            ...(module.exports ?? []),
            IatpSiopService,
            IatpHolderService,
            IatpVerifierService,
          ];
          break;
        case PresentationType.OID4VP:
          Logger.debug(
            `OID4VP Presentation protocol not yet supported`,
            "PresentationModule"
          );
          break;
      }
    }
    return module;
  }
}
