import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import {
  SemanticObservabilityInsight,
  SemanticObservabilityReport,
  SemanticObservabilitySnapshotRefreshStatus
} from "@tsg-dsp/semantic-observability";

import { PageDto, PageOptionsDto } from "../utils/pagination.js";
import {
  SemanticObservabilityEventDao,
  SemanticObservabilityMetricSnapshotDao
} from "./semantic-observability.dao.js";
import {
  SemanticObservabilityEventFilterDto,
  SemanticObservabilityReportFilterDto,
  SemanticObservabilitySnapshotFilterDto
} from "./semantic-observability.dto.js";
import { SemanticObservabilityService } from "./semantic-observability.service.js";

@ApiTags("Semantic Observability")
@Controller("/management/semantic-observability")
@UsePipes(new ValidationPipe({ transform: true }))
export class SemanticObservabilityController {
  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  @Get("events")
  @Requires(Action.READ, Resource.HDP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get semantic observability events" })
  @ApiQuery({ type: SemanticObservabilityEventFilterDto })
  @ApiQuery({ type: PageOptionsDto })
  @ApiOkResponse({ type: PageDto<SemanticObservabilityEventDao> })
  @HttpCode(HttpStatus.OK)
  async getEvents(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() filter: SemanticObservabilityEventFilterDto
  ): Promise<PageDto<SemanticObservabilityEventDao>> {
    return this.semanticObservabilityService.getEvents(pageOptionsDto, filter);
  }

  @Get("report")
  @Requires(Action.READ, Resource.HDP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get semantic observability report" })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getReport(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityService.getReport(filter);
  }

  @Get("insights")
  @Requires(Action.READ, Resource.HDP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get semantic observability insights" })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getInsights(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityInsight[]> {
    return this.semanticObservabilityService.getInsights(filter);
  }

  @Get("report/snapshots")
  @Requires(Action.READ, Resource.HDP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get persisted semantic observability report" })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @HttpCode(HttpStatus.OK)
  async getSnapshotReport(
    @Query() filter: SemanticObservabilitySnapshotFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityService.getSnapshotReport(filter);
  }

  @Get("report/snapshots/status")
  @Requires(Action.READ, Resource.HDP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get semantic observability snapshot refresh status"
  })
  @HttpCode(HttpStatus.OK)
  async getSnapshotRefreshStatus(): Promise<SemanticObservabilitySnapshotRefreshStatus> {
    return this.semanticObservabilityService.getSnapshotRefreshStatus();
  }

  @Post("report/snapshots/refresh")
  @Requires(Action.MANAGE, Resource.HDP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Refresh persisted semantic observability metrics" })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @ApiOkResponse({
    type: SemanticObservabilityMetricSnapshotDao,
    isArray: true
  })
  @HttpCode(HttpStatus.OK)
  async refreshSnapshots(
    @Query() queryFilter: SemanticObservabilitySnapshotFilterDto,
    @Body() bodyFilter: SemanticObservabilitySnapshotFilterDto = {}
  ): Promise<SemanticObservabilityMetricSnapshotDao[]> {
    return this.semanticObservabilityService.refreshSnapshots({
      ...queryFilter,
      ...bodyFilter
    });
  }
}
