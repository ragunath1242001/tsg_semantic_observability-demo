import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { ClientsModule } from "../clients/clients.module.js";
import { KeyDao } from "../model/keys.dao.js";
import { TokenDao } from "../model/token.dao.js";
import { UsersModule } from "../users/users.module.js";
import { IngressAuthController } from "./ingress-auth.controller.js";
import { IngressAuthService } from "./ingress-auth.service.js";
import { MetadataController } from "./metadata.controller.js";
import { OauthController } from "./oauth.controller.js";
import { OauthService } from "./oauth.service.js";
import { TokenService } from "./token.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenDao, KeyDao]),
    UsersModule,
    ClientsModule,
    AuthModule
  ],
  providers: [OauthService, TokenService, IngressAuthService],
  controllers: [OauthController, MetadataController, IngressAuthController],
  exports: [OauthService]
})
export class OauthModule {}
