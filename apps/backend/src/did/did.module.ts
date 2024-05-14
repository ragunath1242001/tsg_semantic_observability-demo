import { Module } from "@nestjs/common";
import { DIDDocuments, DIDService } from "../model/credentials.dao.js";
import { DidService } from "./did.service.js";
import { DidResolverService } from "./did.resolver.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module.js";
import { DIDController } from "./did.controller.js";
import { DIDManagementController } from "./did.management.controller.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DIDDocuments, DIDService])],
  controllers: [DIDController, DIDManagementController],
  providers: [DidService, DidResolverService],
  exports: [DidService, DidResolverService],
})
export class DidModule {}
