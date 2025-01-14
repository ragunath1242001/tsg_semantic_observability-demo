import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { PageOptionsDto, PageDto } from "../utils/pagination.js";
import { LoggingService } from "./logging.service.js";
import { LogFilterDto, LogEntry } from "./logging.dto.js";

@Controller("/management/logging")
@UsePipes(new ValidationPipe({ transform: true }))
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get("ingress")
  @HttpCode(HttpStatus.OK)
  async getIngressLogs(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() filter: LogFilterDto
  ): Promise<PageDto<LogEntry>> {
    return this.loggingService.getIngressLog(pageOptionsDto, filter);
  }

  @Get("egress")
  @HttpCode(HttpStatus.OK)
  async getEgressLogs(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() filter: LogFilterDto
  ): Promise<PageDto<LogEntry>> {
    return this.loggingService.getEgressLog(pageOptionsDto, filter);
  }
}
