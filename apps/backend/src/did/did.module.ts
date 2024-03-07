import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DIDDocuments } from "../model/credentials.dao.js";
import { DidService } from "./did.service.js";
import { DidResolverService } from "./did.resolver.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DIDDocuments])],
  providers: [DidService, DidResolverService],
  exports: [DidService, DidResolverService],
})
export class DidModule {}
