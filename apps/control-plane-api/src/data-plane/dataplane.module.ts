import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataPlane.service.js";
import { CatalogModule } from "../dsp/catalog/catalog.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneDao } from "../model/dataPlanes.dao.js";
import { DataplaneManagementController } from "./dataPlaneManagement.controller.js";
import { NegotiationModule } from "../dsp/negotiation/negotiation.module.js";
import { PolicyModule } from "../policy/policy.module.js";
import { AuthModule } from "@tsg-dsp/common-api";
import { RootConfig } from "../config.js";

@Module({
  imports: [
    CatalogModule,
    TypeOrmModule.forFeature([DataPlaneDao]),
    AuthModule.register(RootConfig),
    NegotiationModule,
    PolicyModule
  ],
  controllers: [DataPlaneController, DataplaneManagementController],
  providers: [DataPlaneService],
  exports: [DataPlaneService]
})
export class DataPlaneModule {}
