import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CreateSemanticObservabilityEvent,
  SemanticObservabilityContext,
  SemanticObservabilityReportFilter,
  SemanticObservabilityReport,
  SemanticObservabilitySnapshotBucket,
  SemanticObservabilitySnapshotFilter,
  SemanticObservabilitySnapshotRefreshStatus,
  SemanticObservabilityInsight,
  buildSemanticObservabilityMetricSnapshots,
  buildSemanticObservabilityInsights,
  buildSemanticObservabilityReport,
  buildSemanticObservabilityReportFromMetrics,
  createSemanticObservabilityEvent,
  pseudonymizeIdentifier,
  sanitizeSemanticObservabilityEvent
} from "@tsg-dsp/semantic-observability";
import { FindOptionsWhere, Repository } from "typeorm";

import { PageDto, PageMetaDto, PageOptionsDto } from "../utils/pagination.js";
import { SemanticObservabilityConfig } from "../config.js";
import {
  SemanticObservabilityEventDao,
  SemanticObservabilityMetricSnapshotDao
} from "./semantic-observability.dao.js";
import { SemanticObservabilityEventFilterDto } from "./semantic-observability.dto.js";
import { SemanticObservabilitySdoExporterService } from "./semantic-observability-sdo-exporter.service.js";

@Injectable()
export class SemanticObservabilityService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SemanticObservabilityService.name);
  private readonly refreshIntervalName = "semanticObservabilitySnapshotRefresh";
  private readonly status: SemanticObservabilitySnapshotRefreshStatus = {
    enabled: true,
    intervalMs: 3600000,
    buckets: [
      SemanticObservabilitySnapshotBucket.HOUR,
      SemanticObservabilitySnapshotBucket.DAY
    ],
    inProgress: false,
    refreshedSnapshots: 0
  };

  constructor(
    @InjectRepository(SemanticObservabilityEventDao)
    private readonly eventRepository: Repository<SemanticObservabilityEventDao>,
    @InjectRepository(SemanticObservabilityMetricSnapshotDao)
    private readonly snapshotRepository: Repository<SemanticObservabilityMetricSnapshotDao>,
    @Optional()
    private readonly schedulerRegistry?: SchedulerRegistry,
    @Optional()
    private readonly semanticObservabilityConfig?: SemanticObservabilityConfig,
    @Optional()
    private readonly sdoExporter?: SemanticObservabilitySdoExporterService
  ) {}

  onApplicationBootstrap() {
    this.configureRefreshStatus();
    if (!this.status.enabled || !this.schedulerRegistry) {
      return;
    }

    const interval = setInterval(
      () => void this.refreshConfiguredSnapshots(),
      this.status.intervalMs
    );
    this.schedulerRegistry.addInterval(this.refreshIntervalName, interval);
    void this.refreshConfiguredSnapshots();
  }

  onApplicationShutdown() {
    try {
      this.schedulerRegistry?.deleteInterval(this.refreshIntervalName);
    } catch (_error) {
      // Interval may not have been registered when scheduling is disabled.
    }
  }

  async recordEvent(
    event: CreateSemanticObservabilityEvent
  ): Promise<SemanticObservabilityEventDao> {
    const participantPseudonym = pseudonymizeIdentifier(
      this.semanticObservabilityConfig?.participantId
    );
    const completeEvent = createSemanticObservabilityEvent({
      ...event,
      context: {
        ...(event.context ?? {}),
        participantPseudonym:
          event.context?.participantPseudonym ?? participantPseudonym
      }
    });
    const persistedEvent = sanitizeSemanticObservabilityEvent(completeEvent);
    const savedEvent = await this.eventRepository.save(
      this.eventRepository.create({
        ...persistedEvent,
        id: persistedEvent.eventId,
        timestamp: persistedEvent.timestamp
      })
    );
    void this.sdoExporter?.exportEvent(savedEvent);
    return savedEvent;
  }

  async getEvents(
    pageOptions: PageOptionsDto,
    filter: SemanticObservabilityEventFilterDto
  ): Promise<PageDto<SemanticObservabilityEventDao>> {
    const [entities, itemCount] = await this.eventRepository.findAndCount({
      order: {
        timestamp: pageOptions.order
      },
      skip: pageOptions.skip,
      take: pageOptions.take,
      where: this.filterClause(filter)
    });

    return new PageDto(entities, new PageMetaDto({ itemCount, pageOptions }));
  }

  async getReport(
    filter: SemanticObservabilityReportFilter
  ): Promise<SemanticObservabilityReport> {
    const events = await this.eventRepository.find({
      order: {
        timestamp: "ASC"
      }
    });
    return buildSemanticObservabilityReport(events, filter);
  }

  async getSnapshotReport(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityReport> {
    const snapshots = await this.getSnapshots(filter);
    return buildSemanticObservabilityReportFromMetrics(snapshots, filter);
  }

  async getInsights(
    filter: SemanticObservabilityReportFilter
  ): Promise<SemanticObservabilityInsight[]> {
    const events = await this.eventRepository.find({
      order: {
        timestamp: "ASC"
      }
    });
    return buildSemanticObservabilityInsights(events, filter);
  }

  async getSnapshots(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityMetricSnapshotDao[]> {
    const where: FindOptionsWhere<SemanticObservabilityMetricSnapshotDao> = {};
    if (filter.bucket) {
      where.bucket = filter.bucket;
    }
    if (filter.metricName) {
      where.metricName = filter.metricName;
    }

    const snapshots = await this.snapshotRepository.find({
      order: {
        timeWindowStart: "ASC",
        metricName: "ASC"
      },
      where
    });

    return snapshots.filter((snapshot) =>
      this.snapshotMatchesFilter(snapshot, filter)
    );
  }

  async refreshSnapshots(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityMetricSnapshotDao[]> {
    const bucket = filter.bucket ?? SemanticObservabilitySnapshotBucket.DAY;
    const events = await this.eventRepository.find({
      order: {
        timestamp: "ASC"
      }
    });
    const snapshots = buildSemanticObservabilityMetricSnapshots(
      events,
      filter,
      {
        bucket
      }
    );
    const removalFilter = {
      ...filter,
      bucket,
      from: filter.from ?? snapshots.at(0)?.timeWindowStart,
      to: filter.to ?? snapshots.at(-1)?.timeWindowEnd
    };

    if (removalFilter.from && removalFilter.to) {
      const existingSnapshots = await this.getSnapshots(removalFilter);
      if (existingSnapshots.length > 0) {
        await this.snapshotRepository.remove(existingSnapshots);
      }
    }

    if (snapshots.length === 0) {
      return [];
    }

    return await this.snapshotRepository.save(
      this.snapshotRepository.create(snapshots)
    );
  }

  getSnapshotRefreshStatus(): SemanticObservabilitySnapshotRefreshStatus {
    return { ...this.status };
  }

  private filterClause(
    filter: SemanticObservabilityEventFilterDto
  ): FindOptionsWhere<SemanticObservabilityEventDao> {
    const whereClause: FindOptionsWhere<SemanticObservabilityEventDao> = {};

    if (filter.component) {
      whereClause.component = filter.component;
    }
    if (filter.eventType) {
      whereClause.eventType = filter.eventType;
    }
    if (filter.status) {
      whereClause.status = filter.status;
    }

    return whereClause;
  }

  private snapshotMatchesFilter(
    snapshot: SemanticObservabilityMetricSnapshotDao,
    filter: SemanticObservabilitySnapshotFilter
  ): boolean {
    if (filter.from && snapshot.timeWindowEnd <= filter.from) {
      return false;
    }
    if (filter.to && snapshot.timeWindowStart >= filter.to) {
      return false;
    }
    if (
      filter.participantPseudonym &&
      snapshot.participantPseudonym !== filter.participantPseudonym
    ) {
      return false;
    }
    if (
      filter.remoteParticipantPseudonym &&
      snapshot.remoteParticipantPseudonym !== filter.remoteParticipantPseudonym
    ) {
      return false;
    }
    if (
      filter.participantPairPseudonym &&
      snapshot.participantPairPseudonym !== filter.participantPairPseudonym
    ) {
      return false;
    }
    if (
      filter.datasetPseudonym &&
      snapshot.datasetPseudonym !== filter.datasetPseudonym
    ) {
      return false;
    }
    if (
      filter.datasetCategory &&
      snapshot.datasetCategory !== filter.datasetCategory
    ) {
      return false;
    }
    if (filter.artefactType && snapshot.artefactType !== filter.artefactType) {
      return false;
    }
    if (
      filter.artefactReference &&
      snapshot.artefactReference !== filter.artefactReference
    ) {
      return false;
    }
    if (
      filter.artefactVersion &&
      snapshot.artefactVersion !== filter.artefactVersion
    ) {
      return false;
    }
    return true;
  }

  private configureRefreshStatus() {
    this.status.enabled = this.semanticObservabilityConfig?.enabled ?? true;
    this.status.intervalMs =
      this.semanticObservabilityConfig?.refreshIntervalInMilliseconds ??
      3600000;
  }

  private async refreshConfiguredSnapshots() {
    if (this.status.inProgress) {
      return;
    }

    this.status.inProgress = true;
    this.status.lastStartedAt = new Date().toISOString();
    this.status.lastError = undefined;

    try {
      const refreshed = await Promise.all(
        this.status.buckets.map((bucket) => this.refreshSnapshots({ bucket }))
      );
      this.status.refreshedSnapshots = refreshed.reduce(
        (total, snapshots) => total + snapshots.length,
        0
      );
      this.status.lastCompletedAt = new Date().toISOString();
    } catch (error) {
      this.status.lastError = "Snapshot refresh failed";
      this.logger.warn(
        "Could not refresh semantic observability snapshots",
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      this.status.inProgress = false;
    }
  }
}
