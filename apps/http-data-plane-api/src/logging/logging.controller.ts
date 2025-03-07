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
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import { Roles } from "@tsg-dsp/common-api";

import { PageDto, PageOptionsDto } from "../utils/pagination.js";
import { LogEntry, LogFilterDto } from "./logging.dto.js";
import { LoggingService } from "./logging.service.js";

@ApiTags("Logging")
@Controller("/management/logging")
@UsePipes(new ValidationPipe({ transform: true }))
@ApiOAuth2(["controlplane_dataplane"])
@Roles("controlplane_dataplane")
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get("ingress")
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
