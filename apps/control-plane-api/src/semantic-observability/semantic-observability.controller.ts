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
import { Paginated, PaginationOptionsDto, Requires } from "@tsg-dsp/common-api";
import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  SemanticObservabilityInsight,
  SemanticObservabilityReport,
  SemanticObservabilitySnapshotRefreshStatus
} from "@tsg-dsp/semantic-observability";

import {
  SemanticObservabilityEventDao,
  SemanticObservabilityMetricSnapshotDao
} from "./semantic-observability.dao.js";
import { SemanticObservabilityCombinedService } from "./semantic-observability-combined.service.js";
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
    private readonly semanticObservabilityService: SemanticObservabilityService,
    private readonly semanticObservabilityCombinedService: SemanticObservabilityCombinedService
  ) {}

  @Get("events")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get semantic observability events" })
  @ApiQuery({ type: SemanticObservabilityEventFilterDto })
  @ApiQuery({ type: PaginationOptionsDto })
  @ApiOkResponse({ type: SemanticObservabilityEventDao, isArray: true })
  @HttpCode(HttpStatus.OK)
  async getEvents(
    @Query() paginationOptions: PaginationOptionsDto,
    @Query() filter: SemanticObservabilityEventFilterDto
  ): Promise<Paginated<SemanticObservabilityEventDao[]>> {
    return this.semanticObservabilityService.getEvents(
      paginationOptions,
      filter
    );
  }

  @Get("combined/events")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined control-plane and data-plane observability events"
  })
  @ApiQuery({ type: SemanticObservabilityEventFilterDto })
  @ApiQuery({ type: PaginationOptionsDto })
  @ApiOkResponse({ type: SemanticObservabilityEventDao, isArray: true })
  @HttpCode(HttpStatus.OK)
  async getCombinedEvents(
    @Query() paginationOptions: PaginationOptionsDto,
    @Query() filter: SemanticObservabilityEventFilterDto
  ): Promise<Paginated<SemanticObservabilityEventDao[]>> {
    return this.semanticObservabilityCombinedService.getEvents(
      paginationOptions,
      filter
    ) as Promise<Paginated<SemanticObservabilityEventDao[]>>;
  }

  @Get("combined/data-plane/events")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined data-plane observability events"
  })
  @ApiQuery({ type: SemanticObservabilityEventFilterDto })
  @ApiQuery({ type: PaginationOptionsDto })
  @ApiOkResponse({ type: SemanticObservabilityEventDao, isArray: true })
  @HttpCode(HttpStatus.OK)
  async getCombinedDataPlaneEvents(
    @Query() paginationOptions: PaginationOptionsDto,
    @Query() filter: SemanticObservabilityEventFilterDto
  ): Promise<Paginated<SemanticObservabilityEventDao[]>> {
    return this.semanticObservabilityCombinedService.getDataPlaneEvents(
      paginationOptions,
      filter
    ) as Promise<Paginated<SemanticObservabilityEventDao[]>>;
  }

  @Get("report")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get semantic observability report" })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getReport(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityService.getReport(filter);
  }

  @Get("insights")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get semantic observability insights" })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getInsights(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityInsight[]> {
    return this.semanticObservabilityService.getInsights(filter);
  }

  @Get("combined/insights")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined control-plane and data-plane observability insights"
  })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getCombinedInsights(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityInsight[]> {
    return this.semanticObservabilityCombinedService.getInsights(filter);
  }

  @Get("combined/data-plane/insights")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined data-plane observability insights"
  })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getCombinedDataPlaneInsights(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityInsight[]> {
    return this.semanticObservabilityCombinedService.getDataPlaneInsights(
      filter
    );
  }

  @Get("combined/report")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined control-plane and data-plane observability report"
  })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getCombinedReport(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityCombinedService.getReport(filter);
  }

  @Get("combined/data-plane/report")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined data-plane observability report"
  })
  @ApiQuery({ type: SemanticObservabilityReportFilterDto })
  @HttpCode(HttpStatus.OK)
  async getCombinedDataPlaneReport(
    @Query() filter: SemanticObservabilityReportFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityCombinedService.getDataPlaneReport(filter);
  }

  @Get("report/snapshots")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({ summary: "Get persisted semantic observability report" })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @HttpCode(HttpStatus.OK)
  async getSnapshotReport(
    @Query() filter: SemanticObservabilitySnapshotFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityService.getSnapshotReport(filter);
  }

  @Get("combined/report/snapshots")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary:
      "Get combined persisted control-plane and data-plane observability report"
  })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @HttpCode(HttpStatus.OK)
  async getCombinedSnapshotReport(
    @Query() filter: SemanticObservabilitySnapshotFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityCombinedService.getSnapshotReport(filter);
  }

  @Get("combined/data-plane/report/snapshots")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined persisted data-plane observability report"
  })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @HttpCode(HttpStatus.OK)
  async getCombinedDataPlaneSnapshotReport(
    @Query() filter: SemanticObservabilitySnapshotFilterDto
  ): Promise<SemanticObservabilityReport> {
    return this.semanticObservabilityCombinedService.getDataPlaneSnapshotReport(
      filter
    );
  }

  @Get("report/snapshots/status")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get semantic observability snapshot refresh status"
  })
  @HttpCode(HttpStatus.OK)
  async getSnapshotRefreshStatus(): Promise<SemanticObservabilitySnapshotRefreshStatus> {
    return this.semanticObservabilityService.getSnapshotRefreshStatus();
  }

  @Get("combined/report/snapshots/status")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary:
      "Get combined semantic observability snapshot refresh status across planes"
  })
  @HttpCode(HttpStatus.OK)
  async getCombinedSnapshotRefreshStatus(): Promise<SemanticObservabilitySnapshotRefreshStatus> {
    return this.semanticObservabilityCombinedService.getSnapshotRefreshStatus();
  }

  @Get("combined/data-plane/report/snapshots/status")
  @Requires(Action.READ, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Get combined data-plane semantic observability refresh status"
  })
  @HttpCode(HttpStatus.OK)
  async getCombinedDataPlaneSnapshotRefreshStatus(): Promise<SemanticObservabilitySnapshotRefreshStatus> {
    return this.semanticObservabilityCombinedService.getDataPlaneSnapshotRefreshStatus();
  }

  @Post("report/snapshots/refresh")
  @Requires(Action.MANAGE, Resource.CP_SEMANTIC_OBSERVABILITY)
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

  @Post("combined/report/snapshots/refresh")
  @Requires(Action.MANAGE, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary:
      "Refresh combined persisted control-plane and data-plane observability metrics"
  })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @ApiOkResponse({
    type: SemanticObservabilityMetricSnapshotDao,
    isArray: true
  })
  @HttpCode(HttpStatus.OK)
  async refreshCombinedSnapshots(
    @Query() queryFilter: SemanticObservabilitySnapshotFilterDto,
    @Body() bodyFilter: SemanticObservabilitySnapshotFilterDto = {}
  ): Promise<SemanticObservabilityMetricSnapshotDao[]> {
    return this.semanticObservabilityCombinedService.refreshSnapshots(
      {
        ...queryFilter,
        ...bodyFilter
      }
    ) as Promise<SemanticObservabilityMetricSnapshotDao[]>;
  }

  @Post("combined/data-plane/report/snapshots/refresh")
  @Requires(Action.MANAGE, Resource.CP_SEMANTIC_OBSERVABILITY)
  @ApiOperation({
    summary: "Refresh combined persisted data-plane observability metrics"
  })
  @ApiQuery({ type: SemanticObservabilitySnapshotFilterDto })
  @ApiOkResponse({
    type: SemanticObservabilityMetricSnapshotDao,
    isArray: true
  })
  @HttpCode(HttpStatus.OK)
  async refreshCombinedDataPlaneSnapshots(
    @Query() queryFilter: SemanticObservabilitySnapshotFilterDto,
    @Body() bodyFilter: SemanticObservabilitySnapshotFilterDto = {}
  ): Promise<SemanticObservabilityMetricSnapshotDao[]> {
    return this.semanticObservabilityCombinedService.refreshDataPlaneSnapshots(
      {
        ...queryFilter,
        ...bodyFilter
      }
    ) as Promise<SemanticObservabilityMetricSnapshotDao[]>;
  }
}
