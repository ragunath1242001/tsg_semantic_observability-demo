import { Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
import {
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import { Response } from "express";

import { EventsService } from "./events.service.js";

@ApiTags("Algorithm Instances")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("management/algorithm-instances/:algorithmInstanceId/events")
@Roles("controlplane_dataplane")
export class EventsManagementController {
  constructor(private readonly eventsService: EventsService) {}

  @Get(":eventId/data")
  @ApiOperation({
    summary: "Download algorithm event data (management)",
    description:
      "Returns the raw binary data for the specified algorithm event. Requires management access role."
  })
  @ApiOkResponse({ description: "Binary event data returned" })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  async getEventDataForManagement(
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Param("eventId", nonEmptyStringPipe) eventId: string,
    @Res() res: Response
  ) {
    const eventData = await this.eventsService.getEventDataForManagement(
      algorithmInstanceId,
      eventId
    );

    if (!eventData) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", eventData.length.toString());
    return res.send(eventData);
  }
}
