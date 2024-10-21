import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { PageOptionsDto, PageDto } from "../utils/pagination";
import { LoggingService } from "./logging.service";
import { LogFilterDto, LogEntry } from "./logging.dto";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Logging")
@Controller("/management/logging")
@UsePipes(new ValidationPipe({ transform: true }))
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
    @Query() filter: LogFilterDto,
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
    @Query() filter: LogFilterDto,
  ): Promise<PageDto<LogEntry>> {
    return this.loggingService.getEgressLog(pageOptionsDto, filter);
  }
}
