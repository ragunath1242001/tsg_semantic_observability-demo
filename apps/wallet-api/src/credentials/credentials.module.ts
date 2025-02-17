import { Module } from "@nestjs/common";
import { CredentialsController } from "./credentials.controller.js";
import { CredentialsService } from "./credentials.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CredentialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { DidModule } from "../did/did.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { CredentialsManagementController } from "./credentials.management.controller.js";
import { GaiaXManagementController } from "./gaiax/gaiax.management.controller.js";
import { GaiaXService } from "./gaiax/gaiax.service.js";
import { ContextModule } from "../contexts/context.module.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    AuthModule,
    DidModule,
    KeysModule,
    ContextModule,
    TypeOrmModule.forFeature([CredentialDao, StatusListCredentialDao])
  ],
  controllers: [
    CredentialsController,
    CredentialsManagementController,
    GaiaXManagementController
  ],
  providers: [CredentialsService, GaiaXService],
  exports: [CredentialsService, GaiaXService]
})
export class CredentialsModule {}
