import {
  SemanticObservabilityEventType,
  SemanticObservabilityStatus
} from "./enums.js";
import { SemanticObservabilityEvent } from "./events.js";
import {
  SemanticObservabilityReportFilter,
  filterEvents
} from "./aggregates.js";

export type SemanticObservabilityInsightSeverity =
  | "info"
  | "warning"
  | "critical";

export type SemanticObservabilityInsightKind =
  | "validation-version-hotspot"
  | "validation-dataset-hotspot"
  | "failure-category-hotspot"
  | "low-metadata-completeness"
  | "unused-artefact";

export interface SemanticObservabilityInsightEvidence {
  totalEvents?: number;
  affectedEvents?: number;
  percentage?: number;
  artefactReference?: string;
  artefactVersion?: string;
  datasetPseudonym?: string;
  failureCategory?: string;
  metadataCompletenessScore?: number;
}

export interface SemanticObservabilityInsight {
  kind: SemanticObservabilityInsightKind;
  severity: SemanticObservabilityInsightSeverity;
  title: string;
  description: string;
  evidence: SemanticObservabilityInsightEvidence;
}

interface GroupedValidationFailure {
  key: string;
  count: number;
  artefactReference?: string;
  artefactVersion?: string;
  datasetPseudonym?: string;
  failureCategory?: string;
}

export function buildSemanticObservabilityInsights(
  events: SemanticObservabilityEvent[],
  filter: SemanticObservabilityReportFilter = {}
): SemanticObservabilityInsight[] {
  const filteredEvents = filterEvents(events, filter);
  const insights = [
    ...buildValidationVersionInsights(filteredEvents),
    ...buildValidationDatasetInsights(filteredEvents),
    ...buildFailureCategoryInsights(filteredEvents),
    ...buildMetadataCompletenessInsights(filteredEvents),
    ...buildUnusedArtefactInsights(filteredEvents)
  ];

  return insights
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 12);
}

function buildValidationVersionInsights(
  events: SemanticObservabilityEvent[]
): SemanticObservabilityInsight[] {
  const validationFailures = events.filter(
    (event) =>
      event.eventType ===
        SemanticObservabilityEventType.METADATA_VALIDATION_RESULT &&
      event.status === SemanticObservabilityStatus.FAILURE
  );
  const totalFailures = validationFailures.length;
  if (totalFailures === 0) {
    return [];
  }

  return topGroups(
    validationFailures.flatMap((event) =>
      (event.artefacts ?? [])
        .filter((artefact) => artefact.version)
        .map((artefact) => ({
          key: `${artefact.reference}:${artefact.version}`,
          count: 1,
          artefactReference: artefact.reference,
          artefactVersion: artefact.version
        }))
    )
  )
    .filter((group) => group.count >= 2 || group.count / totalFailures >= 0.5)
    .map((group) => {
      const percentage = percentageOf(group.count, totalFailures);
      return {
        kind: "validation-version-hotspot",
        severity: percentage >= 80 ? "critical" : "warning",
        title: `Artefact version ${group.artefactVersion} drives ${percentage}% of validation failures`,
        description:
          "A single semantic artefact version is responsible for a large share of metadata validation failures.",
        evidence: {
          totalEvents: totalFailures,
          affectedEvents: group.count,
          percentage,
          artefactReference: group.artefactReference,
          artefactVersion: group.artefactVersion
        }
      };
    });
}

function buildValidationDatasetInsights(
  events: SemanticObservabilityEvent[]
): SemanticObservabilityInsight[] {
  const validationFailures = events.filter(
    (event) =>
      event.eventType ===
        SemanticObservabilityEventType.METADATA_VALIDATION_RESULT &&
      event.status === SemanticObservabilityStatus.FAILURE &&
      event.context?.datasetPseudonym
  );
  const totalFailures = validationFailures.length;
  if (totalFailures === 0) {
    return [];
  }

  return topGroups(
    validationFailures.map((event) => ({
      key: event.context?.datasetPseudonym ?? "",
      count: 1,
      datasetPseudonym: event.context?.datasetPseudonym
    }))
  )
    .filter((group) => group.count >= 2 || group.count / totalFailures >= 0.5)
    .map((group) => {
      const percentage = percentageOf(group.count, totalFailures);
      return {
        kind: "validation-dataset-hotspot",
        severity: percentage >= 80 ? "critical" : "warning",
        title: `Dataset ${group.datasetPseudonym} accounts for ${percentage}% of validation failures`,
        description:
          "A pseudonymized dataset is responsible for a large share of metadata validation failures.",
        evidence: {
          totalEvents: totalFailures,
          affectedEvents: group.count,
          percentage,
          datasetPseudonym: group.datasetPseudonym
        }
      };
    });
}

function buildFailureCategoryInsights(
  events: SemanticObservabilityEvent[]
): SemanticObservabilityInsight[] {
  const failures = events.filter(
    (event) =>
      event.status === SemanticObservabilityStatus.FAILURE &&
      event.failureCategory
  );
  const totalFailures = failures.length;
  if (totalFailures === 0) {
    return [];
  }

  return topGroups(
    failures.map((event) => ({
      key: event.failureCategory ?? "",
      count: 1,
      failureCategory: event.failureCategory
    }))
  )
    .filter((group) => group.count >= 2 || group.count / totalFailures >= 0.5)
    .map((group) => {
      const percentage = percentageOf(group.count, totalFailures);
      return {
        kind: "failure-category-hotspot",
        severity: percentage >= 80 ? "critical" : "warning",
        title: `${group.failureCategory} causes ${percentage}% of failures`,
        description:
          "One failure category dominates the observed semantic or transfer failures.",
        evidence: {
          totalEvents: totalFailures,
          affectedEvents: group.count,
          percentage,
          failureCategory: group.failureCategory
        }
      };
    });
}

function buildMetadataCompletenessInsights(
  events: SemanticObservabilityEvent[]
): SemanticObservabilityInsight[] {
  return events
    .filter(
      (event) =>
        event.metadataCompletenessScore !== undefined &&
        event.metadataCompletenessScore < 0.6
    )
    .slice(0, 3)
    .map((event) => ({
      kind: "low-metadata-completeness",
      severity:
        (event.metadataCompletenessScore ?? 0) < 0.4 ? "critical" : "warning",
      title: `Dataset ${event.context?.datasetPseudonym ?? "metadata"} has low metadata completeness`,
      description:
        "Metadata completeness is below the expected threshold based on observed semantic metadata fields.",
      evidence: {
        datasetPseudonym: event.context?.datasetPseudonym,
        metadataCompletenessScore: event.metadataCompletenessScore,
        percentage: percentageOf(event.metadataCompletenessScore ?? 0, 1)
      }
    }));
}

function buildUnusedArtefactInsights(
  events: SemanticObservabilityEvent[]
): SemanticObservabilityInsight[] {
  const observedArtefacts = new Map<string, GroupedValidationFailure>();
  const successfulArtefacts = new Set<string>();

  for (const event of events) {
    for (const artefact of event.artefacts ?? []) {
      const key = `${artefact.reference}:${artefact.version ?? ""}`;
      observedArtefacts.set(key, {
        key,
        count: 1,
        artefactReference: artefact.reference,
        artefactVersion: artefact.version
      });
      if (event.status === SemanticObservabilityStatus.SUCCESS) {
        successfulArtefacts.add(key);
      }
    }
  }

  return [...observedArtefacts.values()]
    .filter((artefact) => !successfulArtefacts.has(artefact.key))
    .slice(0, 3)
    .map((artefact) => ({
      kind: "unused-artefact",
      severity: "info",
      title: `Artefact ${artefact.artefactReference} has no successful usage yet`,
      description:
        "This semantic artefact was observed, but no successful event references it in the selected window.",
      evidence: {
        artefactReference: artefact.artefactReference,
        artefactVersion: artefact.artefactVersion
      }
    }));
}

function topGroups(groups: GroupedValidationFailure[]) {
  const grouped = new Map<string, GroupedValidationFailure>();
  for (const group of groups) {
    if (!group.key) continue;
    const existing = grouped.get(group.key);
    if (existing) {
      existing.count += group.count;
    } else {
      grouped.set(group.key, { ...group });
    }
  }
  return [...grouped.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function percentageOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function severityRank(severity: SemanticObservabilityInsightSeverity): number {
  switch (severity) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
  }
}
