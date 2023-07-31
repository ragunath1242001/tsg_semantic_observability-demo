import { Module } from "@nestjs/common";
import { DspModule } from "./controllers/dsp/dsp.module";
import { DataPlaneModule } from "./controllers/data-plane/dataplane.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  exports: [DspModule, DataPlaneModule]
})
export class AppModule {}