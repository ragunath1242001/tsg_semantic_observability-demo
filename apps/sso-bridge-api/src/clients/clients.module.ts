import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { KubernetesModule } from "../k8s/kubernetes.module.js";
import { OauthClient } from "../model/client.dao.js";
import { RolesModule } from "../roles/roles.module.js";
import { ClientsController } from "./clients.controller.js";
import { ClientsService } from "./clients.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([OauthClient]),
    KubernetesModule,
    RolesModule
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService]
})
export class ClientsModule {}
