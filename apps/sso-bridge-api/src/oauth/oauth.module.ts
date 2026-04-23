import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { ClientsModule } from "../clients/clients.module.js";
import { UsersModule } from "../users/users.module.js";
import { IngressAuthController } from "./ingress-auth.controller.js";
import { IngressAuthService } from "./ingress-auth.service.js";
import { MetadataController } from "./metadata.controller.js";
import { OauthController } from "./oauth.controller.js";
import { OauthService } from "./oauth.service.js";

@Module({
  imports: [UsersModule, ClientsModule, AuthModule],
  providers: [OauthService, IngressAuthService],
  controllers: [OauthController, MetadataController, IngressAuthController],
  exports: [OauthService]
})
export class OauthModule {}
