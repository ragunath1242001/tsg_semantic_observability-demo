import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "@tsg-dsp/common-api";
import { CommonDataPlaneModule } from "@tsg-dsp/common-data-plane-api";

import { AlgorithmInstancesModule } from "../algorithm-instances/algorithm-instances.module.js";
import { BridgeWsClientListeners } from "../bridge/client/bridge-ws-client.listeners.js";
import { SplitModeModule } from "../bridge/split-mode/split-mode.module.js";
import { DataPlaneModule } from "../dataplane/dataplane.module.js";
import { splitModules } from "../utils/split-mode.js";
import { AlgorithmEventDao } from "./algorithm-event.dao.js";
import { EventsController } from "./events.controller.js";
import { EventsGateway } from "./events.gateway.js";
import { EventsManagementController } from "./events.management.controller.js";
import { EventsService } from "./events.service.js";
import { InternalEventDao } from "./internal-event.dao.js";

@Module({
  imports: [
    ...splitModules([DataPlaneModule]),
    AuthModule,
    AlgorithmInstancesModule,
    SplitModeModule,
    TypeOrmModule.forFeature([AlgorithmEventDao, InternalEventDao]),
    CommonDataPlaneModule
  ],
  controllers: splitModules(
    [EventsController],
    [EventsController, EventsManagementController],
    [EventsController, EventsManagementController]
  ),
  providers: [EventsService, EventsGateway],
  exports: [EventsService, EventsGateway]
})
export class EventsModule implements OnModuleInit {
  constructor(
    private readonly eventsService: EventsService,
    private readonly bridgeWsClientListeners: BridgeWsClientListeners
  ) {}

  onModuleInit(): void {
    this.bridgeWsClientListeners.setAlgorithmEventHandler(this.eventsService);
  }
}
