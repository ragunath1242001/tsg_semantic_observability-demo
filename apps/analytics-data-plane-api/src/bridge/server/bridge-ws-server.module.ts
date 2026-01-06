import { Global, Module } from "@nestjs/common";
import { AuthModule } from "@tsg-dsp/common-api";

import { SplitModeModule } from "../split-mode/split-mode.module.js";
import { BridgeModule } from "./bridge.module.js";
import { BridgeWsGateway } from "./bridge-ws.gateway.js";
import { BridgeWsPublisherService } from "./bridge-ws-publisher.service.js";
import { BridgeWsServerListeners } from "./bridge-ws-server.listeners.js";

@Global()
@Module({
  imports: [SplitModeModule, BridgeModule, AuthModule],
  providers: [
    BridgeWsGateway,
    BridgeWsPublisherService,
    BridgeWsServerListeners
  ],
  exports: [BridgeWsPublisherService]
})
export class BridgeWsServerModule {}
