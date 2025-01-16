import { Module } from "@nestjs/common";
import { KeyMaterials } from "../model/credentials.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KeysController } from "./keys.controller.js";
import { KeysService } from "./keys.service.js";
import { DidModule } from "../did/did.module.js";
import { KeysManagementController } from "./keys.management.controller.js";
import { SignatureService } from "./signature.service.js";
import { SignatureManagementController } from "./signature.management.controller.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    AuthModule.register(RootConfig),
    DidModule,
    TypeOrmModule.forFeature([KeyMaterials])
  ],
  controllers: [
    KeysController,
    KeysManagementController,
    SignatureManagementController
  ],
  providers: [KeysService, SignatureService],
  exports: [KeysService, SignatureService]
})
export class KeysModule {}
