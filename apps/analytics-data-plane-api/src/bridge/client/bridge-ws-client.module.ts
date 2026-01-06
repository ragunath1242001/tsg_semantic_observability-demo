import { Global, Module } from "@nestjs/common";
import { AuthModule } from "@tsg-dsp/common-api";

import { SplitModeModule } from "../split-mode/split-mode.module.js";
import { BridgeWsClientListeners } from "./bridge-ws-client.listeners.js";
import { BridgeWsClientService } from "./bridge-ws-client.service.js";

@Global()
@Module({
  imports: [SplitModeModule, AuthModule],
  providers: [BridgeWsClientService, BridgeWsClientListeners],
  exports: [BridgeWsClientService, BridgeWsClientListeners]
})
export class BridgeWsClientModule {}
