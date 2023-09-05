import { Module } from "@nestjs/common";
import { DataPlaneTestController } from "./dataplane.controller";
import { DataPlaneService } from "./dataplane.service";

@Module({
  imports: [],
  controllers: [DataPlaneTestController],
  providers: [DataPlaneService]

})
export class DataPlaneTestModule {}