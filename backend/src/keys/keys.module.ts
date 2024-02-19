import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { KeyMaterials } from "../model/credentials.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KeysController } from "./keys.controller.js";
import { KeysService } from "./keys.service.js";
import { DidModule } from "../did/did.module.js";
import { KeysManagementController } from "./keys.management.controller.js";

@Module({
  imports: [
    AuthModule,
    DidModule,
    TypeOrmModule.forFeature([KeyMaterials]),
  ],
  controllers: [
    KeysController,
    KeysManagementController
  ],
  providers: [
    KeysService
  ],
  exports: [
    KeysService
  ]
})
export class KeysModule {}