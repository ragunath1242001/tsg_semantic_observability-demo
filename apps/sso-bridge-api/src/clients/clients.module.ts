import { Module } from "@nestjs/common";
import { ClientsService } from "./clients.service.js";
import { ClientsController } from "./clients.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OauthClient } from "../model/client.dao.js";
import { KubernetesModule } from "../k8s/kubernetes.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([OauthClient]), KubernetesModule],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService]
})
export class ClientsModule {}
