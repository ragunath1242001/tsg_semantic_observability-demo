import { Module } from "@nestjs/common";
import { DidService } from "./did.service.js";
import { DidResolverService } from "./did.resolver.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module.js";
import { DIDController } from "./did.controller.js";
import { DIDManagementController } from "./did.management.controller.js";
import { DIDDocuments, DIDService } from "../model/did.dao.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DIDDocuments, DIDService])],
  controllers: [DIDController, DIDManagementController],
  providers: [DidService, DidResolverService],
  exports: [DidService, DidResolverService],
})
export class DidModule {}
