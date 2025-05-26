import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AnalysesModule } from "../analyses/analyses.module.js";
import { DataPlaneTestModule } from "../dataplane/dataplane.module.js";
import { AlgorithmEventDao } from "./dao/algorithm-event.dao.js";
import { InternalEventDao } from "./dao/internal-event.dao.js";
import { EventsController } from "./events.controller.js";
import { EventsService } from "./events.service.js";

@Module({
  imports: [
    DataPlaneTestModule,
    AnalysesModule,
    TypeOrmModule.forFeature([AlgorithmEventDao, InternalEventDao])
  ],
  controllers: [EventsController],
  providers: [EventsService]
})
export class EventsModule {}
