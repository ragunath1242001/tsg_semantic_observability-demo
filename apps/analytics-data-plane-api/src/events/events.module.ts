import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonDataPlaneModule } from "@tsg-dsp/common-data-plane-api";

import { AlgorithmInstancesModule } from "../algorithm-instances/algorithm-instances.module.js";
import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { EventsController } from "./events.controller.js";
import { EventsManagementController } from "./events.management.controller.js";
import { EventsService } from "./events.service.js";
import { InternalEventDao } from "./internal-event.dao.js";

@Module({
  imports: [
    DataPlaneModule,
    AlgorithmInstancesModule,
    TypeOrmModule.forFeature([AlgorithmEventDao, InternalEventDao]),
    CommonDataPlaneModule
  ],
  controllers: [EventsController, EventsManagementController],
  providers: [EventsService]
})
export class EventsModule {}
