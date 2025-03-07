import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";

import { CatalogModule } from "../dsp/catalog/catalog.module.js";
import { NegotiationModule } from "../dsp/negotiation/negotiation.module.js";
import { DataPlaneDao } from "../model/dataPlanes.dao.js";
import { PolicyModule } from "../policy/policy.module.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataPlane.service.js";
import { DataplaneManagementController } from "./dataPlaneManagement.controller.js";

@Module({
  imports: [
    CatalogModule,
    TypeOrmModule.forFeature([DataPlaneDao]),
    AuthModule,
    NegotiationModule,
    PolicyModule
  ],
  controllers: [DataPlaneController, DataplaneManagementController],
  providers: [DataPlaneService],
  exports: [DataPlaneService]
})
export class DataPlaneModule {}
