import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { Request } from "express";
import getRawBody from "raw-body";

import { CreateAlgorithmEventDto } from "./dto/create-algorithm-event.dto.js";
import { CreateInternalEventDto } from "./dto/create-internal-event.dto.js";
import { EventsService } from "./events.service.js";

@Controller("events/:analysisId")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("internal-event")
  @ApiBody({
    type: CreateInternalEventDto
  })
  async createInternalEvent(
    @Param("analysisId") analysisId: string,
    @Body()
    createInternalEvent: CreateInternalEventDto
  ) {
    return await this.eventsService.createInternalEvent({
      analysisId,
      createInternalEvent
    });
  }

  @Post("algorithm-event")
  @ApiBody({
    type: CreateAlgorithmEventDto
  })
  @ApiOperation({
    summary: "Create an algorithm event",
    description: "Creates an algorithm event for the specified analysis."
  })
  @ApiOkResponse({
    description: "The algorithm event has been successfully created.",
    type: CreateAlgorithmEventDto
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async createAlgorithmEvent(
    @Param("analysisId") analysisId: string,
    @Body()
    createEvent: CreateAlgorithmEventDto,
    @Headers("Authorization") authorizationHeader: string
  ) {
    return this.eventsService.createAlgorithmEvent({
      createEvent: createEvent,
      analysisId,
      authorizationHeader
    });
  }

  @Post("upload/:eventId")
  @ApiOperation({
    summary: "Upload algorithm event data",
    description: "Uploads binary algorithm event data."
  })
  @ApiOkResponse({
    description:
      "The binary algorithm event data has been successfully uploaded."
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.CREATED)
  async uploadEventData(
    @Param("analysisId") analysisId: string,
    @Param("eventId") eventId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers("Authorization") authorizationHeader: string
  ) {
    const buffer = await getRawBody(req, {
      length: req.headers["content-length"],
      limit: "10mb",
      encoding: null
    });

    await this.eventsService.uploadAlgorithmEventData({
      analysisId,
      eventData: buffer,
      eventId,
      authorizationHeader
    });
  }

  @Get("data/:eventId")
  async getEventData(
    @Param("analysisId") analysisId: string,
    @Param("eventId") eventId: string,
    @Headers("Authorization") authorizationHeader: string
  ) {
    return await this.eventsService.getEventData({
      analysisId,
      eventId,
      authorizationHeader
    });
  }
}
