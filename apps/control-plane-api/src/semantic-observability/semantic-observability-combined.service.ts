import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AuthClientService,
  Paginated,
  PaginationOptionsDto
} from "@tsg-dsp/common-api";
import {
  SemanticObservabilityEvent,
  SemanticObservabilityInsight,
  SemanticObservabilityMetric,
  SemanticObservabilityMetricSnapshot,
  SemanticObservabilityReport,
  SemanticObservabilityReportFilter,
  SemanticObservabilitySnapshotBucket,
  SemanticObservabilitySnapshotFilter,
  SemanticObservabilitySnapshotRefreshStatus,
  buildSemanticObservabilityReportFromMetrics,
  flattenSemanticObservabilityReport
} from "@tsg-dsp/semantic-observability";
import { AxiosInstance } from "axios";
import { Repository } from "typeorm";

import { DataPlaneDao } from "../model/dataPlanes.dao.js";
import { SemanticObservabilityEventFilterDto } from "./semantic-observability.dto.js";
import { SemanticObservabilityService } from "./semantic-observability.service.js";

interface RemoteEventPage {
  data?: SemanticObservabilityEvent[];
  total?: number;
  meta?: {
    itemCount?: number;
  };
}

@Injectable()
export class SemanticObservabilityCombinedService {
  private readonly logger = new Logger(this.constructor.name);
  private readonly axios: AxiosInstance;
  private readonly remoteEventPageSize = 50;
  private readonly remoteEventPageLimit = 10;

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService,
    private readonly authClientService: AuthClientService,
    @InjectRepository(DataPlaneDao)
    private readonly dataPlaneRepository: Repository<DataPlaneDao>
  ) {
    this.axios = this.authClientService.axiosInstance({
      timeout: 5000
    });
  }

  async getEvents(
    paginationOptions: PaginationOptionsDto,
    filter: SemanticObservabilityEventFilterDto
  ): Promise<Paginated<SemanticObservabilityEvent[]>> {
    const events = await this.getCombinedEventSet(filter);
    const sortedEvents = this.sortEvents(
      events,
      paginationOptions.order,
      paginationOptions.order_by
    );
    const page = sortedEvents.slice(
      paginationOptions.skip,
      paginationOptions.skip + paginationOptions.take
    );

    return {
      data: page,
      total: sortedEvents.length
    };
  }

  async getDataPlaneEvents(
    paginationOptions: PaginationOptionsDto,
    filter: SemanticObservabilityEventFilterDto
  ): Promise<Paginated<SemanticObservabilityEvent[]>> {
    const events = (await this.requestDataPlaneEvents(filter)).flatMap(
      (page) => page.data ?? []
    );
    const sortedEvents = this.sortEvents(
      events,
      paginationOptions.order,
      paginationOptions.order_by
    );
    const page = sortedEvents.slice(
      paginationOptions.skip,
      paginationOptions.skip + paginationOptions.take
    );

    return {
      data: page,
      total: sortedEvents.length
    };
  }

  async getReport(
    filter: SemanticObservabilityReportFilter
  ): Promise<SemanticObservabilityReport> {
    const reports = await Promise.all([
      this.semanticObservabilityService.getReport(filter),
      ...(
        await this.requestFromDataPlanes<SemanticObservabilityReport>(
          "semantic-observability/report",
          { ...filter }
        )
      ).map((result) => result.data)
    ]);

    return this.mergeReports(reports, filter);
  }

  async getDataPlaneReport(
    filter: SemanticObservabilityReportFilter
  ): Promise<SemanticObservabilityReport> {
    const reports = (
      await this.requestFromDataPlanes<SemanticObservabilityReport>(
        "semantic-observability/report",
        { ...filter }
      )
    ).map((result) => result.data);

    return this.mergeReports(reports, filter);
  }

  async getInsights(
    filter: SemanticObservabilityReportFilter
  ): Promise<SemanticObservabilityInsight[]> {
    const localInsights =
      await this.semanticObservabilityService.getInsights(filter);
    const remoteInsights = (
      await this.requestFromDataPlanes<SemanticObservabilityInsight[]>(
        "semantic-observability/insights",
        { ...filter }
      )
    ).flatMap((result) => result.data);

    return this.mergeInsights([...localInsights, ...remoteInsights]);
  }

  async getDataPlaneInsights(
    filter: SemanticObservabilityReportFilter
  ): Promise<SemanticObservabilityInsight[]> {
    const remoteInsights = (
      await this.requestFromDataPlanes<SemanticObservabilityInsight[]>(
        "semantic-observability/insights",
        { ...filter }
      )
    ).flatMap((result) => result.data);

    return this.mergeInsights(remoteInsights);
  }

  async getSnapshotReport(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityReport> {
    const reports = await Promise.all([
      this.semanticObservabilityService.getSnapshotReport(filter),
      ...(
        await this.requestFromDataPlanes<SemanticObservabilityReport>(
          "semantic-observability/report/snapshots",
          { ...filter }
        )
      ).map((result) => result.data)
    ]);

    return this.mergeReports(reports, filter);
  }

  async getDataPlaneSnapshotReport(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityReport> {
    const reports = (
      await this.requestFromDataPlanes<SemanticObservabilityReport>(
        "semantic-observability/report/snapshots",
        { ...filter }
      )
    ).map((result) => result.data);

    return this.mergeReports(reports, filter);
  }

  async getSnapshotRefreshStatus(): Promise<SemanticObservabilitySnapshotRefreshStatus> {
    const localStatus =
      this.semanticObservabilityService.getSnapshotRefreshStatus();
    const remoteStatuses = (
      await this.requestFromDataPlanes<SemanticObservabilitySnapshotRefreshStatus>(
        "semantic-observability/report/snapshots/status"
      )
    ).map((result) => result.data);
    const statuses = [localStatus, ...remoteStatuses];
    const lastCompletedAt = statuses
      .map((status) => status.lastCompletedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    const lastStartedAt = statuses
      .map((status) => status.lastStartedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    return {
      enabled: statuses.some((status) => status.enabled),
      intervalMs: localStatus.intervalMs,
      buckets: [...new Set(statuses.flatMap((status) => status.buckets))],
      inProgress: statuses.some((status) => status.inProgress),
      lastStartedAt,
      lastCompletedAt,
      lastError: statuses.some((status) => status.lastError)
        ? "Snapshot refresh failed"
        : undefined,
      refreshedSnapshots: statuses.reduce(
        (total, status) => total + status.refreshedSnapshots,
        0
      )
    };
  }

  async getDataPlaneSnapshotRefreshStatus(): Promise<SemanticObservabilitySnapshotRefreshStatus> {
    const remoteStatuses = (
      await this.requestFromDataPlanes<SemanticObservabilitySnapshotRefreshStatus>(
        "semantic-observability/report/snapshots/status"
      )
    ).map((result) => result.data);
    return this.mergeRefreshStatuses(remoteStatuses);
  }

  async refreshSnapshots(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityMetricSnapshot[]> {
    const localSnapshots =
      await this.semanticObservabilityService.refreshSnapshots(filter);
    const remoteSnapshots = (
      await this.postToDataPlanes<SemanticObservabilityMetricSnapshot[]>(
        "semantic-observability/report/snapshots/refresh",
        { ...filter }
      )
    ).flatMap((result) => result.data);

    return this.mergeMetrics([...localSnapshots, ...remoteSnapshots]).map(
      (metric) => ({
        ...metric,
        generatedAt:
          "generatedAt" in metric && typeof metric.generatedAt === "string"
            ? metric.generatedAt
            : new Date().toISOString(),
        bucket: filter.bucket ?? SemanticObservabilitySnapshotBucket.DAY,
        eventCount: metricEventCount(metric) ?? metric.count ?? 0
      })
    );
  }

  async refreshDataPlaneSnapshots(
    filter: SemanticObservabilitySnapshotFilter
  ): Promise<SemanticObservabilityMetricSnapshot[]> {
    const remoteSnapshots = (
      await this.postToDataPlanes<SemanticObservabilityMetricSnapshot[]>(
        "semantic-observability/report/snapshots/refresh",
        { ...filter }
      )
    ).flatMap((result) => result.data);

    return this.mergeMetrics(remoteSnapshots).map((metric) => ({
      ...metric,
      generatedAt:
        "generatedAt" in metric && typeof metric.generatedAt === "string"
          ? metric.generatedAt
          : new Date().toISOString(),
      bucket: filter.bucket ?? SemanticObservabilitySnapshotBucket.DAY,
      eventCount: metricEventCount(metric) ?? metric.count ?? 0
    }));
  }

  private async getCombinedEventSet(
    filter: SemanticObservabilityEventFilterDto
  ): Promise<SemanticObservabilityEvent[]> {
    const localEvents = (
      await this.semanticObservabilityService.getEvents(
        PaginationOptionsDto.NO_PAGINATION,
        filter
      )
    ).data;
    const remoteEvents = (await this.requestDataPlaneEvents(filter)).flatMap(
      (page) => page.data ?? []
    );

    return [...localEvents, ...remoteEvents];
  }

  private async requestDataPlaneEvents(
    filter: SemanticObservabilityEventFilterDto
  ): Promise<RemoteEventPage[]> {
    const dataPlanes = await this.getObservableDataPlanes();
    const pages = await Promise.allSettled(
      dataPlanes.map(async (dataPlane) => {
        const collected: RemoteEventPage[] = [];
        for (let page = 1; page <= this.remoteEventPageLimit; page += 1) {
          const response = await this.axios.get<RemoteEventPage>(
            this.dataPlaneUrl(dataPlane, "semantic-observability/events"),
            {
              params: {
                ...filter,
                page,
                take: this.remoteEventPageSize,
                per_page: this.remoteEventPageSize,
                order: "DESC",
                order_by: "timestamp"
              }
            }
          );
          const responsePage = response.data;
          collected.push(responsePage);
          const events = responsePage.data ?? [];
          const total =
            responsePage.total ?? responsePage.meta?.itemCount ?? events.length;
          if (
            events.length === 0 ||
            collected.flatMap((entry) => entry.data ?? []).length >= total
          ) {
            break;
          }
        }
        return collected;
      })
    );

    return pages.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      this.logger.warn(
        `Could not fetch semantic observability events from data plane ${
          dataPlanes[index]?.id ?? "unknown"
        }`
      );
      return [];
    });
  }

  private async requestFromDataPlanes<T>(
    path: string,
    params?: object
  ): Promise<Array<{ dataPlane: DataPlaneDao; data: T }>> {
    const dataPlanes = await this.getObservableDataPlanes();
    const results = await Promise.allSettled(
      dataPlanes.map(async (dataPlane) => ({
        dataPlane,
        data: (
          await this.axios.get<T>(this.dataPlaneUrl(dataPlane, path), {
            params
          })
        ).data
      }))
    );

    return this.fulfilledDataPlaneResults(results, dataPlanes, path);
  }

  private async postToDataPlanes<T>(
    path: string,
    params?: object
  ): Promise<Array<{ dataPlane: DataPlaneDao; data: T }>> {
    const dataPlanes = await this.getObservableDataPlanes();
    const results = await Promise.allSettled(
      dataPlanes.map(async (dataPlane) => ({
        dataPlane,
        data: (
          await this.axios.post<T>(this.dataPlaneUrl(dataPlane, path), null, {
            params
          })
        ).data
      }))
    );

    return this.fulfilledDataPlaneResults(results, dataPlanes, path);
  }

  private fulfilledDataPlaneResults<T>(
    results: Array<PromiseSettledResult<{ dataPlane: DataPlaneDao; data: T }>>,
    dataPlanes: DataPlaneDao[],
    path: string
  ): Array<{ dataPlane: DataPlaneDao; data: T }> {
    return results.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return [result.value];
      }
      this.logger.warn(
        `Could not fetch semantic observability ${path} from data plane ${
          dataPlanes[index]?.id ?? "unknown"
        }`
      );
      return [];
    });
  }

  private mergeRefreshStatuses(
    statuses: SemanticObservabilitySnapshotRefreshStatus[]
  ): SemanticObservabilitySnapshotRefreshStatus {
    const lastCompletedAt = statuses
      .map((status) => status.lastCompletedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    const lastStartedAt = statuses
      .map((status) => status.lastStartedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    return {
      enabled: statuses.some((status) => status.enabled),
      intervalMs: statuses[0]?.intervalMs ?? 0,
      buckets: [...new Set(statuses.flatMap((status) => status.buckets))],
      inProgress: statuses.some((status) => status.inProgress),
      lastStartedAt,
      lastCompletedAt,
      lastError: statuses.some((status) => status.lastError)
        ? "Snapshot refresh failed"
        : undefined,
      refreshedSnapshots: statuses.reduce(
        (total, status) => total + status.refreshedSnapshots,
        0
      )
    };
  }

  private async getObservableDataPlanes(): Promise<DataPlaneDao[]> {
    return await this.dataPlaneRepository.find({
      select: {
        id: true,
        managementAddress: true
      },
      where: {}
    });
  }

  private dataPlaneUrl(dataPlane: DataPlaneDao, path: string): string {
    return `${dataPlane.managementAddress.replace(/\/$/, "")}/${path}`;
  }

  private mergeReports(
    reports: SemanticObservabilityReport[],
    filter: SemanticObservabilityReportFilter
  ): SemanticObservabilityReport {
    const metrics = this.mergeMetrics(
      reports.flatMap((report) => flattenSemanticObservabilityReport(report))
    );
    return buildSemanticObservabilityReportFromMetrics(metrics, filter);
  }

  private mergeMetrics(
    metrics: SemanticObservabilityMetric[]
  ): SemanticObservabilityMetric[] {
    const groups = new Map<string, SemanticObservabilityMetric[]>();
    for (const metric of metrics) {
      const key = [
        metric.timeWindowStart,
        metric.timeWindowEnd,
        metric.metricName,
        metric.failureCategory ?? "",
        metric.participantPseudonym ?? "",
        metric.remoteParticipantPseudonym ?? "",
        metric.participantPairPseudonym ?? "",
        metric.datasetPseudonym ?? "",
        metric.datasetCategory ?? "",
        metric.artefactType ?? "",
        metric.artefactReference ?? "",
        metric.artefactVersion ?? ""
      ].join("|");
      groups.set(key, [...(groups.get(key) ?? []), metric]);
    }

    return [...groups.values()].map((group) => {
      const [first] = group;
      const count = group.reduce(
        (total, metric) => total + (metric.count ?? 0),
        0
      );
      const eventCount = group.reduce(
        (total, metric) => total + (metricEventCount(metric) ?? 0),
        0
      );
      const successCount = group.reduce(
        (total, metric) => total + (metric.successCount ?? 0),
        0
      );
      const failureCount = group.reduce(
        (total, metric) => total + (metric.failureCount ?? 0),
        0
      );
      const averageLatencyMs = weightedAverage(
        group
          .filter((metric) => metric.averageLatencyMs !== undefined)
          .map((metric) => ({
            value: metric.averageLatencyMs!,
            weight: metric.count ?? metricEventCount(metric) ?? 1
          }))
      );
      const metricValue = this.mergeMetricValue(group);

      return {
        ...first,
        metricValue,
        count: count || first.count,
        eventCount: eventCount || metricEventCount(first),
        successCount: successCount || first.successCount,
        failureCount: failureCount || first.failureCount,
        averageLatencyMs: averageLatencyMs ?? first.averageLatencyMs
      };
    });
  }

  private mergeMetricValue(metrics: SemanticObservabilityMetric[]): number {
    const first = metrics[0];
    if (
      first.metricName.includes("count") ||
      first.metricName.includes("latency")
    ) {
      return metrics.reduce((total, metric) => total + metric.metricValue, 0);
    }

    return (
      weightedAverage(
        metrics.map((metric) => ({
          value: metric.metricValue,
          weight: metric.count ?? metricEventCount(metric) ?? 1
        }))
      ) ?? first.metricValue
    );
  }

  private sortEvents(
    events: SemanticObservabilityEvent[],
    order: "ASC" | "DESC",
    orderBy: string
  ): SemanticObservabilityEvent[] {
    return [...events].sort((a, b) => {
      const left = String(readEventValue(a, orderBy) ?? "");
      const right = String(readEventValue(b, orderBy) ?? "");
      return order === "ASC"
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });
  }

  private mergeInsights(
    insights: SemanticObservabilityInsight[]
  ): SemanticObservabilityInsight[] {
    return [...insights]
      .sort((a, b) => {
        const severityDelta =
          insightSeverityRank(b.severity) - insightSeverityRank(a.severity);
        if (severityDelta !== 0) {
          return severityDelta;
        }
        return (
          (b.evidence.percentage ?? 0) - (a.evidence.percentage ?? 0) ||
          (b.evidence.affectedEvents ?? 0) - (a.evidence.affectedEvents ?? 0)
        );
      })
      .slice(0, 12);
  }
}

function weightedAverage(
  values: Array<{ value: number; weight: number }>
): number | undefined {
  const totalWeight = values.reduce((total, item) => total + item.weight, 0);
  if (totalWeight <= 0) {
    return undefined;
  }
  return (
    values.reduce((total, item) => total + item.value * item.weight, 0) /
    totalWeight
  );
}

function readEventValue(
  event: SemanticObservabilityEvent,
  path: string
): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[part]
          : undefined,
      event
    );
}

function metricEventCount(
  metric: SemanticObservabilityMetric
): number | undefined {
  return (metric as SemanticObservabilityMetric & { eventCount?: number })
    .eventCount;
}

function insightSeverityRank(
  severity: SemanticObservabilityInsight["severity"]
): number {
  switch (severity) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
  }
}
