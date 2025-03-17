import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { DidModule } from "../did/did.module.js";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { SIToken } from "../model/dcp.dao.js";
import { KeysController } from "./keys.controller.js";
import { KeysManagementController } from "./keys.management.controller.js";
import { KeysService } from "./keys.service.js";
import { SignatureManagementController } from "./signature.management.controller.js";
import { SignatureService } from "./signature.service.js";
import { SecureTokenService } from "./token.service.js";

@Module({
  imports: [
    AuthModule,
    DidModule,
    TypeOrmModule.forFeature([KeyMaterialDao, SIToken])
  ],
  controllers: [
    KeysController,
    KeysManagementController,
    SignatureManagementController
  ],
  providers: [KeysService, SignatureService, SecureTokenService],
  exports: [KeysService, SignatureService, SecureTokenService]
})
export class KeysModule {}
