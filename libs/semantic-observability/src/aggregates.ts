import {
  SemanticArtefactType,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityMetricName
} from "./enums.js";
import { SemanticObservabilityEvent } from "./events.js";
import { SemanticObservabilityStatus } from "./enums.js";

export interface SemanticObservabilityReportFilter {
  from?: string;
  to?: string;
  participantPseudonym?: string;
  remoteParticipantPseudonym?: string;
  participantPairPseudonym?: string;
  datasetPseudonym?: string;
  datasetCategory?: string;
  artefactType?: SemanticArtefactType;
  artefactReference?: string;
  artefactVersion?: string;
}

export enum SemanticObservabilitySnapshotBucket {
  HOUR = "hour",
  DAY = "day"
}

export interface SemanticObservabilitySnapshotFilter extends SemanticObservabilityReportFilter {
  bucket?: SemanticObservabilitySnapshotBucket;
  metricName?: SemanticObservabilityMetricName;
}

export interface SemanticObservabilityMetric {
  timeWindowStart: string;
  timeWindowEnd: string;
  metricName: SemanticObservabilityMetricName;
  metricValue: number;
  count?: number;
  successCount?: number;
  failureCount?: number;
  failureCategory?: string;
  averageLatencyMs?: number;
  participantPseudonym?: string;
  remoteParticipantPseudonym?: string;
  participantPairPseudonym?: string;
  datasetPseudonym?: string;
  datasetCategory?: string;
  artefactType?: SemanticArtefactType;
  artefactReference?: string;
  artefactVersion?: string;
}

export interface SemanticObservabilityMetricSnapshot extends SemanticObservabilityMetric {
  generatedAt: string;
  bucket: SemanticObservabilitySnapshotBucket;
  eventCount: number;
}

export interface SemanticObservabilitySnapshotRefreshStatus {
  enabled: boolean;
  intervalMs: number;
  buckets: SemanticObservabilitySnapshotBucket[];
  inProgress: boolean;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  refreshedSnapshots: number;
}

export interface SemanticObservabilityReport {
  generatedAt: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  adoption: SemanticObservabilityMetric[];
  friction: SemanticObservabilityMetric[];
  evolution: SemanticObservabilityMetric[];
  stability: SemanticObservabilityMetric[];
}

export interface BuildSemanticObservabilitySnapshotOptions {
  bucket?: SemanticObservabilitySnapshotBucket;
  generatedAt?: string;
}

export function calculateRate(
  successCount: number,
  totalCount: number
): number {
  if (totalCount <= 0) {
    return 0;
  }

  return successCount / totalCount;
}

export function calculateMetadataCompletenessScore(
  observedFields: Array<string | undefined>,
  expectedFieldCount: number
): number {
  if (expectedFieldCount <= 0) {
    return 0;
  }

  const presentFieldCount = observedFields.filter(Boolean).length;
  return presentFieldCount / expectedFieldCount;
}

export function buildSemanticObservabilityReport(
  events: SemanticObservabilityEvent[],
  filter: SemanticObservabilityReportFilter = {}
): SemanticObservabilityReport {
  const filteredEvents = filterEvents(events, filter).sort((a, b) =>
    eventTimestamp(a).localeCompare(eventTimestamp(b))
  );
  const now = new Date().toISOString();
  const timeWindowStart =
    filter.from ??
    (filteredEvents.at(0) ? eventTimestamp(filteredEvents[0]) : undefined) ??
    now;
  const timeWindowEnd =
    filter.to ??
    (filteredEvents.at(-1)
      ? eventTimestamp(filteredEvents[filteredEvents.length - 1])
      : undefined) ??
    now;

  return {
    generatedAt: now,
    timeWindowStart,
    timeWindowEnd,
    adoption: buildAdoptionMetrics(
      filteredEvents,
      timeWindowStart,
      timeWindowEnd,
      filter
    ),
    friction: buildFrictionMetrics(
      filteredEvents,
      timeWindowStart,
      timeWindowEnd,
      filter
    ),
    evolution: buildEvolutionMetrics(
      filteredEvents,
      timeWindowStart,
      timeWindowEnd,
      filter
    ),
    stability: buildStabilityMetrics(
      filteredEvents,
      timeWindowStart,
      timeWindowEnd,
      filter
    )
  };
}

export function buildSemanticObservabilityMetricSnapshots(
  events: SemanticObservabilityEvent[],
  filter: SemanticObservabilityReportFilter = {},
  options: BuildSemanticObservabilitySnapshotOptions = {}
): SemanticObservabilityMetricSnapshot[] {
  const bucket = options.bucket ?? SemanticObservabilitySnapshotBucket.DAY;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const groupedEvents = groupEventsByBucket(
    filterEvents(events, filter),
    bucket
  );

  return [...groupedEvents.entries()].flatMap(
    ([timeWindowStart, bucketEvents]) => {
      const timeWindowEnd = getBucketEnd(timeWindowStart, bucket);
      const snapshotFilters = getSnapshotScopeFilters(bucketEvents, filter);

      return snapshotFilters.flatMap((snapshotFilter) => {
        const scopedFilter = {
          ...snapshotFilter,
          from: timeWindowStart,
          to: timeWindowEnd
        };
        const scopedEvents = filterEvents(bucketEvents, scopedFilter);
        if (scopedEvents.length === 0) {
          return [];
        }

        const report = buildSemanticObservabilityReport(
          scopedEvents,
          scopedFilter
        );

        return flattenSemanticObservabilityReport(report).map((metric) => ({
          ...metric,
          generatedAt,
          bucket,
          eventCount: scopedEvents.length
        }));
      });
    }
  );
}

export function buildSemanticObservabilityReportFromMetrics(
  metrics: SemanticObservabilityMetric[],
  filter: SemanticObservabilitySnapshotFilter = {}
): SemanticObservabilityReport {
  const filteredMetrics = filterMetrics(metrics, filter).sort((a, b) =>
    a.timeWindowStart.localeCompare(b.timeWindowStart)
  );
  const now = new Date().toISOString();
  const timeWindowStart =
    filter.from ?? filteredMetrics.at(0)?.timeWindowStart ?? now;
  const timeWindowEnd =
    filter.to ?? filteredMetrics.at(-1)?.timeWindowEnd ?? now;

  return {
    generatedAt: now,
    timeWindowStart,
    timeWindowEnd,
    adoption: filteredMetrics.filter(
      (metric) => metricCategory(metric.metricName) === "adoption"
    ),
    friction: filteredMetrics.filter(
      (metric) => metricCategory(metric.metricName) === "friction"
    ),
    evolution: filteredMetrics.filter(
      (metric) => metricCategory(metric.metricName) === "evolution"
    ),
    stability: filteredMetrics.filter(
      (metric) => metricCategory(metric.metricName) === "stability"
    )
  };
}

export function flattenSemanticObservabilityReport(
  report: SemanticObservabilityReport
): SemanticObservabilityMetric[] {
  return [
    ...report.adoption,
    ...report.friction,
    ...report.evolution,
    ...report.stability
  ];
}

export function filterEvents(
  events: SemanticObservabilityEvent[],
  filter: SemanticObservabilityReportFilter = {}
): SemanticObservabilityEvent[] {
  const fromMs = filter.from ? Date.parse(filter.from) : undefined;
  const toMs = filter.to ? Date.parse(filter.to) : undefined;

  return events.filter((event) => {
    const eventMs = Date.parse(eventTimestamp(event));
    if (fromMs !== undefined && eventMs < fromMs) {
      return false;
    }
    if (toMs !== undefined && eventMs > toMs) {
      return false;
    }
    if (
      filter.participantPseudonym &&
      event.context?.participantPseudonym !== filter.participantPseudonym
    ) {
      return false;
    }
    if (
      filter.remoteParticipantPseudonym &&
      event.context?.remoteParticipantPseudonym !==
        filter.remoteParticipantPseudonym
    ) {
      return false;
    }
    if (
      filter.participantPairPseudonym &&
      event.context?.participantPairPseudonym !==
        filter.participantPairPseudonym
    ) {
      return false;
    }
    if (
      filter.datasetPseudonym &&
      event.context?.datasetPseudonym !== filter.datasetPseudonym
    ) {
      return false;
    }
    if (
      filter.datasetCategory &&
      event.context?.datasetCategory !== filter.datasetCategory
    ) {
      return false;
    }
    if (
      filter.artefactType ||
      filter.artefactReference ||
      filter.artefactVersion
    ) {
      return (
        event.artefacts?.some((artefact) => {
          if (filter.artefactType && artefact.type !== filter.artefactType) {
            return false;
          }
          if (
            filter.artefactReference &&
            artefact.reference !== filter.artefactReference
          ) {
            return false;
          }
          if (
            filter.artefactVersion &&
            artefact.version !== filter.artefactVersion
          ) {
            return false;
          }
          return true;
        }) ?? false
      );
    }
    return true;
  });
}

function buildAdoptionMetrics(
  events: SemanticObservabilityEvent[],
  timeWindowStart: string,
  timeWindowEnd: string,
  filter: SemanticObservabilityReportFilter
): SemanticObservabilityMetric[] {
  const adoptionEvents = byDimension(
    events,
    SemanticObservabilityDimension.ADOPTION
  );
  const metadataScores = adoptionEvents
    .map((event) => event.metadataCompletenessScore)
    .filter((score): score is number => score !== undefined);

  return [
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.SEMANTIC_MODEL_COVERAGE,
        metricValue: artefactCoverage(adoptionEvents, [
          SemanticArtefactType.SEMANTIC_MODEL,
          SemanticArtefactType.BASE_SEMANTIC_MODEL,
          SemanticArtefactType.ONTOLOGY,
          SemanticArtefactType.VOCABULARY
        ]),
        count: adoptionEvents.length
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.SCHEMA_REFERENCE_COVERAGE,
        metricValue: artefactCoverage(adoptionEvents, [
          SemanticArtefactType.SCHEMA,
          SemanticArtefactType.OPENAPI_SPEC
        ]),
        count: adoptionEvents.length
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.METADATA_COMPLETENESS_SCORE,
        metricValue: average(metadataScores),
        count: metadataScores.length
      },
      filter
    )
  ];
}

function buildFrictionMetrics(
  events: SemanticObservabilityEvent[],
  timeWindowStart: string,
  timeWindowEnd: string,
  filter: SemanticObservabilityReportFilter
): SemanticObservabilityMetric[] {
  const validationEvents = byEventType(
    events,
    SemanticObservabilityEventType.METADATA_VALIDATION_RESULT
  );
  const policyEvents = byEventType(
    events,
    SemanticObservabilityEventType.POLICY_EVALUATION_RESULT
  );
  const negotiationEvents = byEventType(
    events,
    SemanticObservabilityEventType.NEGOTIATION_STATE_CHANGED
  );
  const transferEvents = byEventType(
    events,
    SemanticObservabilityEventType.TRANSFER_STATE_CHANGED
  );
  const dataPlaneAccessEvents = byEventType(
    events,
    SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED
  );

  return [
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.VALIDATION_ERROR_RATE,
        metricValue: failureRate(validationEvents),
        count: validationEvents.length,
        failureCount: failureCount(validationEvents)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.POLICY_FAILURE_COUNT,
        metricValue: failureCount(policyEvents),
        count: policyEvents.length,
        failureCount: failureCount(policyEvents)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.NEGOTIATION_FAILURE_RATE,
        metricValue: failureRate(negotiationEvents),
        count: negotiationEvents.length,
        failureCount: failureCount(negotiationEvents)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.TRANSFER_FAILURE_RATE,
        metricValue: failureRate(transferEvents),
        count: transferEvents.length,
        failureCount: failureCount(transferEvents)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName:
          SemanticObservabilityMetricName.DATA_PLANE_ACCESS_FAILURE_RATE,
        metricValue: failureRate(dataPlaneAccessEvents),
        count: dataPlaneAccessEvents.length,
        failureCount: failureCount(dataPlaneAccessEvents)
      },
      filter
    )
  ];
}

function buildEvolutionMetrics(
  events: SemanticObservabilityEvent[],
  timeWindowStart: string,
  timeWindowEnd: string,
  filter: SemanticObservabilityReportFilter
): SemanticObservabilityMetric[] {
  const artefacts = events.flatMap((event) => event.artefacts ?? []);
  const versionedArtefacts = artefacts.filter((artefact) => artefact.version);

  return [
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName:
          SemanticObservabilityMetricName.ARTEFACT_VERSION_ADOPTION_RATE,
        metricValue: calculateRate(versionedArtefacts.length, artefacts.length),
        count: artefacts.length
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName:
          SemanticObservabilityMetricName.DEPRECATED_ARTEFACT_USAGE_RATE,
        metricValue: deprecatedArtefactUsageRate(artefacts),
        count: artefacts.length
      },
      filter
    )
  ];
}

function buildStabilityMetrics(
  events: SemanticObservabilityEvent[],
  timeWindowStart: string,
  timeWindowEnd: string,
  filter: SemanticObservabilityReportFilter
): SemanticObservabilityMetric[] {
  const negotiationEvents = byEventType(
    events,
    SemanticObservabilityEventType.NEGOTIATION_STATE_CHANGED
  );
  const transferEvents = byEventType(
    events,
    SemanticObservabilityEventType.TRANSFER_STATE_CHANGED
  );
  const dataPlaneAccessEvents = byEventType(
    events,
    SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED
  );
  const transferLatencies = transferEvents
    .map((event) => event.durationMs)
    .filter((duration): duration is number => duration !== undefined);

  return [
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.NEGOTIATION_SUCCESS_RATE,
        metricValue: successRate(negotiationEvents),
        count: negotiationEvents.length,
        successCount: successCount(negotiationEvents),
        failureCount: failureCount(negotiationEvents)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName: SemanticObservabilityMetricName.TRANSFER_SUCCESS_RATE,
        metricValue: successRate(transferEvents),
        count: transferEvents.length,
        successCount: successCount(transferEvents),
        failureCount: failureCount(transferEvents),
        averageLatencyMs: average(transferLatencies)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName:
          SemanticObservabilityMetricName.AVERAGE_TRANSFER_SETUP_LATENCY,
        metricValue: average(transferLatencies),
        count: transferLatencies.length,
        averageLatencyMs: average(transferLatencies)
      },
      filter
    ),
    scopedMetric(
      {
        timeWindowStart,
        timeWindowEnd,
        metricName:
          SemanticObservabilityMetricName.DATA_PLANE_ACCESS_SUCCESS_RATE,
        metricValue: successRate(dataPlaneAccessEvents),
        count: dataPlaneAccessEvents.length,
        successCount: successCount(dataPlaneAccessEvents),
        failureCount: failureCount(dataPlaneAccessEvents)
      },
      filter
    )
  ];
}

function byDimension(
  events: SemanticObservabilityEvent[],
  dimension: SemanticObservabilityDimension
): SemanticObservabilityEvent[] {
  return events.filter((event) => event.dimensions.includes(dimension));
}

function byEventType(
  events: SemanticObservabilityEvent[],
  eventType: SemanticObservabilityEventType
): SemanticObservabilityEvent[] {
  return events.filter((event) => event.eventType === eventType);
}

function artefactCoverage(
  events: SemanticObservabilityEvent[],
  artefactTypes: SemanticArtefactType[]
): number {
  return calculateRate(
    events.filter((event) =>
      event.artefacts?.some((artefact) => artefactTypes.includes(artefact.type))
    ).length,
    events.length
  );
}

function successRate(events: SemanticObservabilityEvent[]): number {
  return calculateRate(successCount(events), events.length);
}

function failureRate(events: SemanticObservabilityEvent[]): number {
  return calculateRate(failureCount(events), events.length);
}

function successCount(events: SemanticObservabilityEvent[]): number {
  return events.filter(
    (event) => event.status === SemanticObservabilityStatus.SUCCESS
  ).length;
}

function failureCount(events: SemanticObservabilityEvent[]): number {
  return events.filter(
    (event) => event.status === SemanticObservabilityStatus.FAILURE
  ).length;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function deprecatedArtefactUsageRate(
  artefacts: Array<{ reference: string }>
): number {
  return calculateRate(
    artefacts.filter((artefact) =>
      /deprecated|obsolete|legacy/i.test(artefact.reference)
    ).length,
    artefacts.length
  );
}

function scopedMetric(
  metric: SemanticObservabilityMetric,
  filter: SemanticObservabilityReportFilter
): SemanticObservabilityMetric {
  return {
    ...metric,
    participantPseudonym: filter.participantPseudonym,
    remoteParticipantPseudonym: filter.remoteParticipantPseudonym,
    participantPairPseudonym: filter.participantPairPseudonym,
    datasetPseudonym: filter.datasetPseudonym,
    datasetCategory: filter.datasetCategory,
    artefactType: filter.artefactType,
    artefactReference: filter.artefactReference,
    artefactVersion: filter.artefactVersion
  };
}

function getSnapshotScopeFilters(
  events: SemanticObservabilityEvent[],
  baseFilter: SemanticObservabilityReportFilter
): SemanticObservabilityReportFilter[] {
  if (hasDimensionFilter(baseFilter)) {
    return [baseFilter];
  }

  const scopes = new Map<string, SemanticObservabilityReportFilter>();
  addScope(scopes, baseFilter);

  for (const event of events) {
    const context = event.context;
    if (context?.participantPseudonym) {
      addScope(scopes, {
        participantPseudonym: context.participantPseudonym
      });
    }
    if (context?.remoteParticipantPseudonym) {
      addScope(scopes, {
        remoteParticipantPseudonym: context.remoteParticipantPseudonym
      });
    }
    if (context?.participantPairPseudonym) {
      addScope(scopes, {
        participantPairPseudonym: context.participantPairPseudonym
      });
    }
    if (context?.datasetPseudonym) {
      addScope(scopes, {
        datasetPseudonym: context.datasetPseudonym
      });
    }
    if (context?.datasetCategory) {
      addScope(scopes, {
        datasetCategory: context.datasetCategory
      });
    }
    if (
      context?.participantPseudonym &&
      context.remoteParticipantPseudonym &&
      context.participantPairPseudonym
    ) {
      addScope(scopes, {
        participantPseudonym: context.participantPseudonym,
        remoteParticipantPseudonym: context.remoteParticipantPseudonym,
        participantPairPseudonym: context.participantPairPseudonym
      });
    }
    if (context?.participantPairPseudonym && context.datasetPseudonym) {
      addScope(scopes, {
        participantPairPseudonym: context.participantPairPseudonym,
        datasetPseudonym: context.datasetPseudonym
      });
    }

    for (const artefact of event.artefacts ?? []) {
      addScope(scopes, {
        artefactType: artefact.type
      });
      addScope(scopes, {
        artefactType: artefact.type,
        artefactReference: artefact.reference,
        artefactVersion: artefact.version
      });
      if (context?.datasetPseudonym) {
        addScope(scopes, {
          datasetPseudonym: context.datasetPseudonym,
          artefactType: artefact.type
        });
      }
    }
  }

  return [...scopes.values()];
}

function addScope(
  scopes: Map<string, SemanticObservabilityReportFilter>,
  scope: SemanticObservabilityReportFilter
) {
  scopes.set(scopeKey(scope), scope);
}

function hasDimensionFilter(
  filter: SemanticObservabilityReportFilter
): boolean {
  return Boolean(
    filter.participantPseudonym ||
    filter.remoteParticipantPseudonym ||
    filter.participantPairPseudonym ||
    filter.datasetPseudonym ||
    filter.datasetCategory ||
    filter.artefactType ||
    filter.artefactReference ||
    filter.artefactVersion
  );
}

function scopeKey(filter: SemanticObservabilityReportFilter): string {
  return [
    filter.participantPseudonym ?? "",
    filter.remoteParticipantPseudonym ?? "",
    filter.participantPairPseudonym ?? "",
    filter.datasetPseudonym ?? "",
    filter.datasetCategory ?? "",
    filter.artefactType ?? "",
    filter.artefactReference ?? "",
    filter.artefactVersion ?? ""
  ].join("|");
}

function filterMetrics(
  metrics: SemanticObservabilityMetric[],
  filter: SemanticObservabilitySnapshotFilter
): SemanticObservabilityMetric[] {
  const fromMs = filter.from ? Date.parse(filter.from) : undefined;
  const toMs = filter.to ? Date.parse(filter.to) : undefined;

  return metrics.filter((metric) => {
    const metricStartMs = Date.parse(metric.timeWindowStart);
    const metricEndMs = Date.parse(metric.timeWindowEnd);
    if (fromMs !== undefined && metricEndMs <= fromMs) {
      return false;
    }
    if (toMs !== undefined && metricStartMs >= toMs) {
      return false;
    }
    if (filter.metricName && metric.metricName !== filter.metricName) {
      return false;
    }
    if (
      filter.participantPseudonym &&
      metric.participantPseudonym !== filter.participantPseudonym
    ) {
      return false;
    }
    if (
      filter.remoteParticipantPseudonym &&
      metric.remoteParticipantPseudonym !== filter.remoteParticipantPseudonym
    ) {
      return false;
    }
    if (
      filter.participantPairPseudonym &&
      metric.participantPairPseudonym !== filter.participantPairPseudonym
    ) {
      return false;
    }
    if (
      filter.datasetPseudonym &&
      metric.datasetPseudonym !== filter.datasetPseudonym
    ) {
      return false;
    }
    if (
      filter.datasetCategory &&
      metric.datasetCategory !== filter.datasetCategory
    ) {
      return false;
    }
    if (filter.artefactType && metric.artefactType !== filter.artefactType) {
      return false;
    }
    if (
      filter.artefactReference &&
      metric.artefactReference !== filter.artefactReference
    ) {
      return false;
    }
    if (
      filter.artefactVersion &&
      metric.artefactVersion !== filter.artefactVersion
    ) {
      return false;
    }
    return true;
  });
}

function groupEventsByBucket(
  events: SemanticObservabilityEvent[],
  bucket: SemanticObservabilitySnapshotBucket
): Map<string, SemanticObservabilityEvent[]> {
  const groups = new Map<string, SemanticObservabilityEvent[]>();
  for (const event of events) {
    const bucketStart = getBucketStart(eventTimestamp(event), bucket);
    groups.set(bucketStart, [...(groups.get(bucketStart) ?? []), event]);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function eventTimestamp(event: SemanticObservabilityEvent): string {
  const timestamp = event.timestamp as unknown;
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return String(timestamp);
}

function getBucketStart(
  timestamp: string,
  bucket: SemanticObservabilitySnapshotBucket
): string {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  if (bucket === SemanticObservabilitySnapshotBucket.DAY) {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.toISOString();
}

function getBucketEnd(
  timeWindowStart: string,
  bucket: SemanticObservabilitySnapshotBucket
): string {
  const date = new Date(timeWindowStart);
  if (bucket === SemanticObservabilitySnapshotBucket.HOUR) {
    date.setUTCHours(date.getUTCHours() + 1);
  } else {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString();
}

function metricCategory(
  metricName: SemanticObservabilityMetricName
): "adoption" | "friction" | "evolution" | "stability" {
  switch (metricName) {
    case SemanticObservabilityMetricName.SEMANTIC_MODEL_COVERAGE:
    case SemanticObservabilityMetricName.SCHEMA_REFERENCE_COVERAGE:
    case SemanticObservabilityMetricName.METADATA_COMPLETENESS_SCORE:
      return "adoption";
    case SemanticObservabilityMetricName.VALIDATION_ERROR_RATE:
    case SemanticObservabilityMetricName.POLICY_FAILURE_COUNT:
    case SemanticObservabilityMetricName.NEGOTIATION_FAILURE_RATE:
    case SemanticObservabilityMetricName.TRANSFER_FAILURE_RATE:
    case SemanticObservabilityMetricName.DATA_PLANE_ACCESS_FAILURE_RATE:
      return "friction";
    case SemanticObservabilityMetricName.ARTEFACT_VERSION_ADOPTION_RATE:
    case SemanticObservabilityMetricName.DEPRECATED_ARTEFACT_USAGE_RATE:
      return "evolution";
    case SemanticObservabilityMetricName.NEGOTIATION_SUCCESS_RATE:
    case SemanticObservabilityMetricName.TRANSFER_SUCCESS_RATE:
    case SemanticObservabilityMetricName.DATA_PLANE_ACCESS_SUCCESS_RATE:
    case SemanticObservabilityMetricName.AVERAGE_TRANSFER_SETUP_LATENCY:
      return "stability";
    default:
      return "friction";
  }
}
