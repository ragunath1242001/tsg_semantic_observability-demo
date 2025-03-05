import { Module } from "@nestjs/common";
import { DidService } from "./did.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DIDWebController } from "./web/did.web.controller.js";
import { DIDManagementController } from "./did.management.controller.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { DIDTdwController } from "./tdw/did.tdw.controller.js";
import { DidTdwStrategy } from "./tdw/did.tdw.strategy.js";
import { DIDMethod } from "@tsg-dsp/common-signing-and-validation";
import { DidWebStrategy } from "./web/did.web.strategy.js";
import { RootConfig } from "../config.js";
import { AuthModule, GenericConfigModule } from "@tsg-dsp/common-api";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([DIDDocuments, DIDService, DIDLogs])
  ],
  controllers: [
    DIDManagementController,
    ...(GenericConfigModule.get(RootConfig).did.method === DIDMethod.WEB
      ? [DIDWebController]
      : []),
    ...(GenericConfigModule.get(RootConfig).did.method === DIDMethod.TDW
      ? [DIDTdwController]
      : [])
  ],
  providers: [
    DidService,
    ...(GenericConfigModule.get(RootConfig).did.method === DIDMethod.WEB
      ? [DidWebStrategy]
      : []),
    ...(GenericConfigModule.get(RootConfig).did.method === DIDMethod.TDW
      ? [DidTdwStrategy]
      : [])
  ],

  exports: [DidService]
})
export class DidModule {}
