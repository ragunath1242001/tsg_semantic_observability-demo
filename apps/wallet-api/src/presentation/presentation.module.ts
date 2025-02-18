import { DynamicModule, Logger, Module } from "@nestjs/common";
import { DirectPresentationController } from "./direct/presentation.controller.js";
import { PresentationService } from "./presentation.service.js";
import { CredentialsModule } from "../credentials/credentials.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { DidModule } from "../did/did.module.js";
import { PresentationConfig, PresentationType } from "../config.js";
import { DCPHolderController } from "./dcp/holder.controller.js";
import { DCPVerifierManagementController } from "./dcp/verifier.management.controller.js";
import { DCPVerifierService } from "./dcp/verifier.service.js";
import { DCPSiopService } from "./dcp/siop.service.js";
import { SIToken } from "../model/dcp.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DCPHolderService } from "./dcp/holder.service.js";
import { DCPHolderManagementController } from "./dcp/holder.management.controller.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { PresentationManagementController } from "./presentation.management.controller.js";
import { OID4VPVerifierService } from "./oid4vp/verifier.service.js";
import { OID4VPVerifierController } from "./oid4vp/verifier.controller.js";
import { OID4VPVerifierManagementController } from "./oid4vp/verifier.management.controller.js";
import { AuthorizationRequestDao } from "../model/presentation.dao.js";

@Module({})
export class PresentationModule {
  static register(presentationConfig: PresentationConfig): DynamicModule {
    const module: DynamicModule = {
      module: PresentationModule,
      imports: [
        AuthModule,
        CredentialsModule,
        KeysModule,
        DidModule,
        TypeOrmModule.forFeature([AuthorizationRequestDao])
      ],
      global: true,
      controllers: [
        PresentationManagementController,
        OID4VPVerifierController,
        OID4VPVerifierManagementController
      ],
      providers: [PresentationService, OID4VPVerifierService],
      exports: [PresentationService]
    };

    for (const type of presentationConfig.types) {
      switch (type) {
        case PresentationType.DIRECT:
          module.controllers = [
            ...(module.controllers ?? []),
            DirectPresentationController
          ];
          break;
        case PresentationType.DCP:
          module.imports = [
            ...(module.imports ?? []),
            TypeOrmModule.forFeature([SIToken])
          ];
          module.controllers = [
            ...(module.controllers ?? []),
            DCPHolderController,
            DCPHolderManagementController,
            DCPVerifierManagementController
          ];
          module.providers = [
            ...(module.providers ?? []),
            DCPSiopService,
            DCPHolderService,
            DCPVerifierService
          ];
          module.exports = [
            ...(module.exports ?? []),
            DCPSiopService,
            DCPHolderService,
            DCPVerifierService
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
