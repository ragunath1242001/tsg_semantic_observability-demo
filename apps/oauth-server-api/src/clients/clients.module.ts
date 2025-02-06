import { Module } from "@nestjs/common";
import { ClientsService } from "./clients.service.js";
import { ClientsController } from "./clients.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OauthClient } from "../model/client.dao.js";

@Module({
  imports: [TypeOrmModule.forFeature([OauthClient])],
  providers: [ClientsService],
  controllers: [ClientsController]
})
export class ClientsModule {}
