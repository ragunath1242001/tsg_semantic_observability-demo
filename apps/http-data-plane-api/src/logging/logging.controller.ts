import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import { Requires } from "@tsg-dsp/common-api";
import { Action, Resource } from "@tsg-dsp/common-dtos";

import { PageDto, PageOptionsDto } from "../utils/pagination.js";
import { LogEntry, LogFilterDto } from "./logging.dto.js";
import { LoggingService } from "./logging.service.js";

@ApiTags("Logging")
@Controller("/management/logging")
@UsePipes(new ValidationPipe({ transform: true }))
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get("ingress")
  @Requires(Action.READ, Resource.HDP_LOGS)
  @ApiOperation({ summary: "Get ingress logs" })
  @ApiQuery({ type: LogFilterDto })
  @ApiQuery({ type: PageOptionsDto })
  @ApiOkResponse({ type: PageDto<LogEntry> })
  @HttpCode(HttpStatus.OK)
  async getIngressLogs(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() filter: LogFilterDto
  ): Promise<PageDto<LogEntry>> {
    return this.loggingService.getIngressLog(pageOptionsDto, filter);
  }

  @Get("egress")
  @Requires(Action.READ, Resource.HDP_LOGS)
  @ApiOperation({ summary: "Get egress logs" })
  @ApiQuery({ type: LogFilterDto })
  @ApiQuery({ type: PageOptionsDto })
  @ApiOkResponse({ type: PageDto<LogEntry> })
  @HttpCode(HttpStatus.OK)
  async getEgressLogs(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() filter: LogFilterDto
  ): Promise<PageDto<LogEntry>> {
    return this.loggingService.getEgressLog(pageOptionsDto, filter);
  }
}
