import { Module } from "@nestjs/common";
import { DIDDocuments } from "../model/credentials.dao.js";
import { DidService } from "./did.service.js";
import { DidResolverService } from "./did.resolver.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DIDDocuments])],
  providers: [DidService, DidResolverService],
  exports: [DidService, DidResolverService],
})
export class DidModule {}
