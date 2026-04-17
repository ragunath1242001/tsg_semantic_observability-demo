import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res
} from "@nestjs/common";
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation
} from "@nestjs/swagger";
import {
  CreateAlgorithmEventDto,
  CreateInternalEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  DisableOAuthGuard,
  nonEmptyStringPipe,
  validationPipe
} from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { Request, Response } from "express";
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
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Body(validationPipe)
    createInternalEvent: CreateInternalEventDto,
    @Headers("Authorization") authorizationHeader?: string
  ) {
    return await this.eventsService.createInternalEvent({
      algorithmInstanceId,
      createInternalEvent,
      authorizationHeader
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
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Body(validationPipe)
    createEvent: CreateAlgorithmEventDto,
    @Headers("Authorization") authorizationHeader?: string
  ) {
    Logger.log(
      `Creating algorithm event for instance ${algorithmInstanceId} with event ${JSON.stringify(createEvent)}`,
      EventsController.name
    );
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
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Param("eventId", nonEmptyStringPipe) eventId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers("Authorization") authorizationHeader?: string
  ) {
    let eventData = req.rawBody;
    if (!eventData) {
      eventData = await getRawBody(req, {
        length: req.headers["content-length"],
        limit: "1024mb"
      });
    }
    await this.eventsService.uploadAlgorithmEventData({
      algorithmInstanceId,
      eventData,
      eventId,
      authorizationHeader
    });
  }

  @Get("data/:eventId")
  async getEventData(
    @Res() res: Response,
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Param("eventId", nonEmptyStringPipe) eventId: string,
    @Headers("Authorization") authorizationHeader?: string
  ) {
    const data = await this.eventsService.getEventData({
      algorithmInstanceId,
      eventId,
      authorizationHeader
    });

    if (!data) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", data.length.toString());
    return res.send(data);
  }

  @Get("poll")
  @ApiOperation({
    summary:
      "Poll for the next available algorithm event for this algorithm instance",
    description:
      "Long polling endpoint that returns the next available algorithm event for this specific algorithm instance. Supports 'since' query parameter with ISO date format to filter events after that timestamp. Only returns external events (excludes own events)."
  })
  @ApiOkResponse({
    description: "The next algorithm event has been found"
  })
  @ApiNoContentResponse({
    description: "No event within longpolling window"
  })
  @ApiForbiddenResponseDefault()
  async pollForAlgorithmEvent(
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Query("since") since?: string,
    @Headers("Authorization") authorizationHeader?: string
  ) {
    return await this.eventsService.pollForAlgorithmEvent(
      algorithmInstanceId,
      authorizationHeader,
      since
    );
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
    @Param("algorithmInstanceId", nonEmptyStringPipe)
    algorithmInstanceId: string,
    @Headers("Authorization") authorizationHeader?: string
  ) {
    return await this.eventsService.getEventsForAlgorithmInstance(
      algorithmInstanceId,
      authorizationHeader
    );
  }
}
