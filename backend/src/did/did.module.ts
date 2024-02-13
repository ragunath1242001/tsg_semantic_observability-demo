import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DIDDocuments } from "../model/credentials.dao.js";
import { DidService } from "./did.service.js";
import { DIDResolver } from "./didResolver.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([DIDDocuments]),
  ],
  providers: [
    DidService,
    DIDResolver
  ],
  exports: [
    DidService,
    DIDResolver
  ]
})
export class DidModule {}