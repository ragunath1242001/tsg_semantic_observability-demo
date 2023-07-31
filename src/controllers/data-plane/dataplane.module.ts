import { Module } from "@nestjs/common";
import { DataPlaneController } from "./dataplane.controller";
import { ServicesModule } from "../../services/services.module";

@Module({
  imports: [ServicesModule],
  controllers: [DataPlaneController],
})
export class DataPlaneModule {}
