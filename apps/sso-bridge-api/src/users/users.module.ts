import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module.js";
import { OauthUser } from "../model/user.dao.js";
import { PermissionsModule } from "../permissions/permissions.module.js";
import { ProfileController } from "./profile.controller.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([OauthUser]),
    PermissionsModule,
    forwardRef(() => AuthModule)
  ],
  providers: [UsersService],
  controllers: [UsersController, ProfileController],
  exports: [UsersService]
})
export class UsersModule {}
