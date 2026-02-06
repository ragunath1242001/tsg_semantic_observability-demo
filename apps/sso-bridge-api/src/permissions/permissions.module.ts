import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OauthClient } from "../model/client.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { PermissionsController } from "./permissions.controller.js";
import { PermissionsService } from "./permissions.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([OauthUser, OauthClient])],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService]
})
export class PermissionsModule {}
