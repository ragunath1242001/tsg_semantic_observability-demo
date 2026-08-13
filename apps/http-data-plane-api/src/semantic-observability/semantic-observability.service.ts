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
  buildSemanticObservabilityInsights,
  buildSemanticObservabilityMetricSnapshots,
  buildSemanticObservabilityReport,
  buildSemanticObservabilityReportFromMetrics,
  CreateSemanticObservabilityEvent,
  createSemanticObservabilityEvent,
  pseudonymizeIdentifier,
  sanitizeSemanticObservabilityEvent,
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityInsight,
  SemanticObservabilityReport,
  SemanticObservabilityReportFilter,
  SemanticObservabilitySnapshotBucket,
  SemanticObservabilitySnapshotFilter,
  SemanticObservabilitySnapshotRefreshStatus,
  SemanticObservabilityStatus
} from "@tsg-dsp/semantic-observability";
import { FindOptionsWhere, LessThan, MoreThan, Repository } from "typeorm";

import { SemanticObservabilityConfig } from "../config.js";
import { PageDto, PageMetaDto, PageOptionsDto } from "../utils/pagination.js";
import {
  SemanticObservabilityEventDao,
  SemanticObservabilityMetricSnapshotDao
} from "./semantic-observability.dao.js";
import { SemanticObservabilityEventFilterDto } from "./semantic-observability.dto.js";
import { SemanticObservabilitySdoExporterService } from "./semantic-observability-sdo-exporter.service.js";

interface FieldUsageObservation {
  governedStandardId?: string;
  version?: string;
  governedFieldIds?: string[];
  observedFieldIds: string[];
}

interface FieldUsageBucket {
  governedStandardId: string;
  version: string;
  timeWindowStart: string;
  observationCount: number;
  presentCounts: Map<string, number>;
}

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
  // ponytail: in-memory counters reset on restart; persist them if production continuity requires it.
  private readonly fieldUsageBuckets = new Map<string, FieldUsageBucket>();

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
    void this.sdoExporter?.exportEvent(persistedEvent);
    return savedEvent;
  }

  async recordFieldUsageObservation(
    observation: FieldUsageObservation
  ): Promise<void> {
    const governedStandardId = observation.governedStandardId?.trim();
    const governedFieldIds = [
      ...new Set(
        (observation.governedFieldIds ?? [])
          .map((fieldId) => fieldId.trim())
          .filter((fieldId) => fieldId.length > 0 && fieldId.length <= 512)
      )
    ];
    if (!governedStandardId || governedFieldIds.length === 0) return;

    const version = observation.version?.trim() || "unversioned";
    const key = JSON.stringify([governedStandardId, version]);
    const bucket = this.fieldUsageBuckets.get(key) ?? {
      governedStandardId,
      version,
      timeWindowStart: new Date().toISOString(),
      observationCount: 0,
      presentCounts: new Map(governedFieldIds.map((fieldId) => [fieldId, 0]))
    };
    const observed = new Set(observation.observedFieldIds);

    for (const fieldId of governedFieldIds) {
      if (!bucket.presentCounts.has(fieldId)) {
        bucket.presentCounts.set(fieldId, 0);
      }
    }
    bucket.observationCount += 1;
    for (const fieldId of bucket.presentCounts.keys()) {
      bucket.presentCounts.set(
        fieldId,
        (bucket.presentCounts.get(fieldId) ?? 0) +
          (observed.has(fieldId) ? 1 : 0)
      );
    }
    this.fieldUsageBuckets.set(key, bucket);

    if (bucket.observationCount >= this.fieldUsageMinimumObservations()) {
      await this.flushFieldUsageBucket(key, bucket);
    }
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
      await this.snapshotRepository.delete({
        bucket,
        timeWindowEnd: MoreThan(removalFilter.from),
        timeWindowStart: LessThan(removalFilter.to),
        ...(filter.metricName && { metricName: filter.metricName }),
        ...(filter.participantPseudonym && {
          participantPseudonym: filter.participantPseudonym
        }),
        ...(filter.remoteParticipantPseudonym && {
          remoteParticipantPseudonym: filter.remoteParticipantPseudonym
        }),
        ...(filter.participantPairPseudonym && {
          participantPairPseudonym: filter.participantPairPseudonym
        }),
        ...(filter.datasetPseudonym && {
          datasetPseudonym: filter.datasetPseudonym
        }),
        ...(filter.datasetCategory && {
          datasetCategory: filter.datasetCategory
        }),
        ...(filter.artefactType && { artefactType: filter.artefactType }),
        ...(filter.artefactReference && {
          artefactReference: filter.artefactReference
        }),
        ...(filter.artefactVersion && {
          artefactVersion: filter.artefactVersion
        })
      });
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

  private fieldUsageMinimumObservations(): number {
    return Math.max(
      2,
      this.semanticObservabilityConfig?.fieldUsageMinimumObservations ?? 5
    );
  }

  private async flushFieldUsageBucket(
    key: string,
    bucket: FieldUsageBucket
  ): Promise<void> {
    const timeWindowEnd = new Date().toISOString();
    await Promise.all(
      [...bucket.presentCounts].map(([fieldId, presentCount]) =>
        this.recordEvent({
          component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
          eventType:
            SemanticObservabilityEventType.SEMANTIC_FIELD_USAGE_SUMMARY,
          dimensions: [SemanticObservabilityDimension.ADOPTION],
          status: SemanticObservabilityStatus.INFO,
          attributes: {
            governedStandardId: bucket.governedStandardId,
            governedVersion: bucket.version,
            fieldId,
            timeWindowStart: bucket.timeWindowStart,
            timeWindowEnd,
            observationCount: bucket.observationCount,
            presentCount
          }
        })
      )
    );
    if (this.fieldUsageBuckets.get(key) === bucket) {
      this.fieldUsageBuckets.delete(key);
    }
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
      await Promise.all(
        [...this.fieldUsageBuckets]
          .filter(
            ([, bucket]) =>
              bucket.observationCount >= this.fieldUsageMinimumObservations()
          )
          .map(([key, bucket]) => this.flushFieldUsageBucket(key, bucket))
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
