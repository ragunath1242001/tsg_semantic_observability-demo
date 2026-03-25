import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BridgeServerConnectionStatusDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { BridgeWsGateway } from "./bridge-ws.gateway.js";

@Controller("bridge/status")
@ApiTags("Bridge")
export class BridgeServerStatusController {
  constructor(private readonly gateway: BridgeWsGateway) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve bridge server connection status",
    description:
      "Returns information about currently connected bridge clients, including connection uptime, OAuth client, and last message timestamps."
  })
  @ApiOkResponse({ type: BridgeServerConnectionStatusDto })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.ADP_DATAPLANE)
  getStatus(): BridgeServerConnectionStatusDto {
    return {
      mode: "server",
      clients: this.gateway.getConnectedClients()
    };
  }
}
