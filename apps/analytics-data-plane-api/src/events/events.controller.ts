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
import {
  CreateAlgorithmEventDto,
  CreateInternalEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { Request } from "express";
import getRawBody from "raw-body";

import { EventsService } from "./events.service.js";

@Controller("events/:algorithmInstanceId")
@DisableOAuthGuard()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("internal-event")
  @ApiBody({
    type: CreateInternalEventDto
  })
  async createInternalEvent(
    @Param("algorithmInstanceId") algorithmInstanceId: string,
    @Body()
    createInternalEvent: CreateInternalEventDto
  ) {
    return await this.eventsService.createInternalEvent({
      algorithmInstanceId,
      createInternalEvent
    });
  }

  @Post("algorithm-event")
  @ApiBody({
    type: CreateAlgorithmEventDto
  })
  @ApiOperation({
    summary: "Create an algorithm event",
    description:
      "Creates an algorithm event for the specified algorithm instance."
  })
  @ApiOkResponse({
    description: "The algorithm event has been successfully created.",
    type: CreateAlgorithmEventDto
  })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async createAlgorithmEvent(
    @Param("algorithmInstanceId") algorithmInstanceId: string,
    @Body()
    createEvent: CreateAlgorithmEventDto,
    @Headers("Authorization") authorizationHeader: string
  ) {
    return this.eventsService.createAlgorithmEvent({
      createEvent: createEvent,
      algorithmInstanceId,
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
    @Param("algorithmInstanceId") algorithmInstanceId: string,
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
      algorithmInstanceId,
      eventData: buffer,
      eventId,
      authorizationHeader
    });
  }

  @Get("data/:eventId")
  async getEventData(
    @Param("algorithmInstanceId") algorithmInstanceId: string,
    @Param("eventId") eventId: string,
    @Headers("Authorization") authorizationHeader: string
  ) {
    return await this.eventsService.getEventData({
      algorithmInstanceId,
      eventId,
      authorizationHeader
    });
  }

  @Get()
  @ApiOperation({
    summary: "Get all events for an algorithm instance",
    description:
      "Retrieves all algorithm and internal events for the specified algorithm instance."
  })
  @ApiOkResponse({
    description: "The events have been successfully retrieved."
  })
  @ApiForbiddenResponseDefault()
  async getEventsForAlgorithmInstance(
    @Param("algorithmInstanceId") algorithmInstanceId: string
  ) {
    return await this.eventsService.getEventsForAlgorithmInstance(
      algorithmInstanceId
    );
  }
}
