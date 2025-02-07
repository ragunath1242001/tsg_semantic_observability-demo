import { Module } from "@nestjs/common";
import { OauthService } from "./oauth.service.js";
import { OauthController } from "./oauth.controller.js";
import { MetadataController } from "./metadata.controller.js";
import { UsersModule } from "../users/users.module.js";
import { TokenService } from "./token.service.js";
import { TokenDao } from "../model/token.dao.js";
import { KeyDao } from "../model/keys.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule } from "../clients/clients.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenDao, KeyDao]),
    UsersModule,
    ClientsModule
  ],
  providers: [OauthService, TokenService],
  controllers: [OauthController, MetadataController]
})
export class OauthModule {}
