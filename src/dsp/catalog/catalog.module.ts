import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";
import { CatalogManagementController } from "./catalogManagement.controller";
import { DspClientModule } from "../client/client.module";


@Module({
  imports: [AuthModule, DspClientModule],
  controllers: [CatalogController, CatalogManagementController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}