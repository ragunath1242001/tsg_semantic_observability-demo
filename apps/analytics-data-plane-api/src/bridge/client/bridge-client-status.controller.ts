import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BridgeClientConnectionStatusDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { BridgeWsClientService } from "./bridge-ws-client.service.js";

@Controller("bridge/status")
@ApiTags("Bridge")
export class BridgeClientStatusController {
  constructor(private readonly clientService: BridgeWsClientService) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve bridge client connection status",
    description:
      "Returns connection status to the bridge server, including uptime, OAuth client, and last message timestamps."
  })
  @ApiOkResponse({ type: BridgeClientConnectionStatusDto })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.ADP_DATAPLANE)
  getStatus(): BridgeClientConnectionStatusDto {
    return this.clientService.getConnectionStatus();
  }
}
