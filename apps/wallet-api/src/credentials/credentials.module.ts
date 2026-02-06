import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AbacModule, AuthModule } from "@tsg-dsp/common-api";
import { Resource } from "@tsg-dsp/common-dtos";

import { DidModule } from "../did/did.module.js";
import { IssueConfigurationModule } from "../issue-configurations/issue-configuration.module.js";
import { KeysModule } from "../keys/keys.module.js";
import {
  CredentialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { CredentialsController } from "./credentials.controller.js";
import { CredentialsManagementController } from "./credentials.management.controller.js";
import { CredentialsService } from "./credentials.service.js";
import { GaiaXManagementController } from "./gaiax/gaiax.management.controller.js";
import { GaiaXService } from "./gaiax/gaiax.service.js";

@Module({
  imports: [
    AuthModule,
    DidModule,
    KeysModule,
    IssueConfigurationModule,
    TypeOrmModule.forFeature([CredentialDao, StatusListCredentialDao])
  ],
  controllers: [
    CredentialsController,
    CredentialsManagementController,
    GaiaXManagementController
  ],
  providers: [
    ...AbacModule.createOwnershipProviders([
      { entity: CredentialDao, resourceType: Resource.W_CREDENTIAL }
    ]),
    CredentialsService,
    GaiaXService
  ],
  exports: [CredentialsService, GaiaXService]
})
export class CredentialsModule {}
