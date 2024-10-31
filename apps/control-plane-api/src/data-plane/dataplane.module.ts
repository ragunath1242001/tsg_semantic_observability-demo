import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogModule } from "../dsp/catalog/catalog.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneDao } from "../model/dataPlanes.dao";
import { DataplaneManagementController } from "./dataPlaneManagement.controller";
import { AuthModule } from "../auth/auth.module";
import { NegotiationModule } from "../dsp/negotiation/negotiation.module";
import { PolicyModule } from "../policy/policy.module";

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
