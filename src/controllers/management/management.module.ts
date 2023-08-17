import { Module } from "@nestjs/common";
import { ServicesModule } from "../../services/services.module";
import { CatalogManagementController } from "./catalogManagement.controller";
import { NegotiationManagementController } from "./negotiationManagement.controller";
import { TransferManagementController } from "./transferManagement.controller";

@Module({
  imports: [ServicesModule],
  controllers: [
    CatalogManagementController, 
    NegotiationManagementController, 
    TransferManagementController],
})
export class ManagementModule {}
