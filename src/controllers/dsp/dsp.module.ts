import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { NegotiationController } from "./negotiation.controller";
import { TransferController } from "./transfer.controller";
import { AuthModule } from "../../auth/auth.module";
import { ServicesModule } from "../../services/services.module";

@Module({
  imports: [AuthModule, ServicesModule],
  controllers: [CatalogController, NegotiationController, TransferController],
})
export class DspModule {}
