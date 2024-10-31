import { Module } from "@nestjs/common";
import { DidService } from "./did.service.js";
import { DidResolverService } from "./did.resolver.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module.js";
import { DIDWebController } from "./web/did.web.controller.js";
import { DIDManagementController } from "./did.management.controller.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { config } from "../config.module.js";
import { DIDTdwController } from "./tdw/did.tdw.controller.js";
import { DidTdwStrategy } from "./tdw/did.tdw.strategy.js";
import { DIDMethod } from "../utils/did.js";
import { DidWebStrategy } from "./web/did.web.strategy.js";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([DIDDocuments, DIDService, DIDLogs])
  ],
  controllers: [
    DIDManagementController,
    ...(config.did.method === DIDMethod.WEB ? [DIDWebController] : []),
    ...(config.did.method === DIDMethod.TDW ? [DIDTdwController] : [])
  ],
  providers: [
    DidService,
    DidResolverService,
    ...(config.did.method === DIDMethod.WEB ? [DidWebStrategy] : []),
    ...(config.did.method === DIDMethod.TDW ? [DidTdwStrategy] : [])
  ],

  exports: [DidService, DidResolverService]
})
export class DidModule {}
