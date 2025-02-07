import { Module } from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OauthUser } from "../model/user.dao.js";

@Module({
  imports: [TypeOrmModule.forFeature([OauthUser])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService]
})
export class UsersModule {}
