import { Module } from "@nestjs/common";
import { ManagementController } from "./management.controller";
import { ServicesModule } from "../../services/services.module";

@Module({
  imports: [ServicesModule],
  controllers: [ManagementController],
})
export class ManagementModule {}
