import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CredentialsController } from "./credentials.controller.js";
import { CredentialsService } from "./credentials.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Credentials } from "../model/credentials.dao.js";
import { DidModule } from "../did/did.module.js";
import { KeysModule } from "../keys/keys.module.js";
import { CredentialsManagementController } from "./credentials.management.controller.js";

@Module({
  imports: [
    AuthModule,
    DidModule,
    KeysModule,
    TypeOrmModule.forFeature([Credentials]),
  ],
  controllers: [
    CredentialsController,
    CredentialsManagementController
  ],
  providers: [
    CredentialsService
  ],
  exports: [
    CredentialsService
  ]
})
export class CredentialsModule {}