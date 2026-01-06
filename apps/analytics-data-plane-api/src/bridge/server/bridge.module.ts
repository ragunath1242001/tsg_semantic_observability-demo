import { Module } from "@nestjs/common";
import { CommonDataPlaneModule } from "@tsg-dsp/common-data-plane-api";

import { AlgorithmInstancesModule } from "../../algorithm-instances/algorithm-instances.module.js";
import { DataPlaneModule } from "../../dataplane/dataplane.module.js";
import { EventsModule } from "../../events/events.module.js";
import { BridgeService } from "./bridge.service.js";

@Module({
  imports: [
    CommonDataPlaneModule,
    DataPlaneModule,
    AlgorithmInstancesModule,
    EventsModule
  ],
  providers: [BridgeService],
  exports: [BridgeService]
})
export class BridgeModule {}
