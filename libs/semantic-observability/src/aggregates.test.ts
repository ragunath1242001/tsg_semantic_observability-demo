import { describe, expect, it } from "vitest";

import {
  SemanticArtefactType,
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityMetricName,
  SemanticObservabilityStatus
} from "./enums.js";
import { SemanticObservabilityEvent } from "./events.js";
import {
  buildSemanticObservabilityReport,
  buildSemanticObservabilityMetricSnapshots,
  buildSemanticObservabilityReportFromMetrics,
  SemanticObservabilitySnapshotBucket
} from "./aggregates.js";

describe("semantic observability aggregate snapshots", () => {
  it("builds time-bucketed metric snapshots and reconstructs reports", () => {
    const events: SemanticObservabilityEvent[] = [
      {
        eventId: "event-1",
        timestamp: "2026-05-31T10:15:00.000Z",
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType:
          SemanticObservabilityEventType.DATASET_CONFIGURATION_OBSERVED,
        dimensions: [SemanticObservabilityDimension.ADOPTION],
        status: SemanticObservabilityStatus.SUCCESS,
        context: {
          datasetPseudonym: "dataset-a"
        },
        artefacts: [
          {
            type: SemanticArtefactType.SEMANTIC_MODEL,
            reference: "https://example.com/model",
            version: "1.0.0"
          }
        ],
        metadataCompletenessScore: 0.5
      },
      {
        eventId: "event-2",
        timestamp: "2026-05-31T10:45:00.000Z",
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
        dimensions: [SemanticObservabilityDimension.STABILITY],
        status: SemanticObservabilityStatus.SUCCESS,
        context: {
          datasetPseudonym: "dataset-a"
        },
        durationMs: 100
      },
      {
        eventId: "event-3",
        timestamp: "2026-05-31T11:05:00.000Z",
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
        dimensions: [
          SemanticObservabilityDimension.FRICTION,
          SemanticObservabilityDimension.STABILITY
        ],
        status: SemanticObservabilityStatus.FAILURE,
        context: {
          datasetPseudonym: "dataset-a"
        },
        durationMs: 200
      }
    ];

    const snapshots = buildSemanticObservabilityMetricSnapshots(
      events,
      { datasetPseudonym: "dataset-a" },
      { bucket: SemanticObservabilitySnapshotBucket.HOUR }
    );

    expect(snapshots).toHaveLength(28);
    expect(snapshots[0].bucket).toBe(SemanticObservabilitySnapshotBucket.HOUR);
    expect(snapshots[0].timeWindowStart).toBe("2026-05-31T10:00:00.000Z");
    expect(snapshots.at(-1)?.timeWindowEnd).toBe("2026-05-31T12:00:00.000Z");

    const transferSuccessMetrics = snapshots.filter(
      (snapshot) =>
        snapshot.metricName ===
        SemanticObservabilityMetricName.TRANSFER_SUCCESS_RATE
    );
    expect(transferSuccessMetrics.map((metric) => metric.metricValue)).toEqual([
      1, 0
    ]);
    expect(transferSuccessMetrics.map((metric) => metric.eventCount)).toEqual([
      2, 1
    ]);

    const report = buildSemanticObservabilityReportFromMetrics(snapshots, {
      metricName: SemanticObservabilityMetricName.TRANSFER_SUCCESS_RATE
    });

    expect(report.stability).toHaveLength(2);
    expect(report.adoption).toHaveLength(0);
    expect(report.timeWindowStart).toBe("2026-05-31T10:00:00.000Z");
    expect(report.timeWindowEnd).toBe("2026-05-31T12:00:00.000Z");
  });

  it("computes data-plane access success and failure rates", () => {
    const events: SemanticObservabilityEvent[] = [
      {
        eventId: "event-1",
        timestamp: "2026-06-08T10:00:00.000Z",
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
        dimensions: [SemanticObservabilityDimension.STABILITY],
        status: SemanticObservabilityStatus.SUCCESS
      },
      {
        eventId: "event-2",
        timestamp: "2026-06-08T10:01:00.000Z",
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          SemanticObservabilityDimension.FRICTION
        ],
        status: SemanticObservabilityStatus.FAILURE,
        failureCategory: "client_or_authorization_error"
      },
      {
        eventId: "event-3",
        timestamp: "2026-06-08T10:02:00.000Z",
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          SemanticObservabilityDimension.FRICTION
        ],
        status: SemanticObservabilityStatus.FAILURE,
        failureCategory: "backend_or_proxy_error"
      }
    ];

    const report = buildSemanticObservabilityReport(events);
    const accessSuccessRate = report.stability.find(
      (metric) =>
        metric.metricName ===
        SemanticObservabilityMetricName.DATA_PLANE_ACCESS_SUCCESS_RATE
    );
    const accessFailureRate = report.friction.find(
      (metric) =>
        metric.metricName ===
        SemanticObservabilityMetricName.DATA_PLANE_ACCESS_FAILURE_RATE
    );

    expect(accessSuccessRate?.metricValue).toBe(1 / 3);
    expect(accessSuccessRate?.successCount).toBe(1);
    expect(accessSuccessRate?.failureCount).toBe(2);
    expect(accessFailureRate?.metricValue).toBe(2 / 3);
    expect(accessFailureRate?.failureCount).toBe(2);
  });

  it("creates scoped snapshots from event dimensions when no dimension filter is provided", () => {
    const events: SemanticObservabilityEvent[] = [
      {
        eventId: "event-1",
        timestamp: "2026-06-08T10:00:00.000Z",
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
        dimensions: [SemanticObservabilityDimension.STABILITY],
        status: SemanticObservabilityStatus.SUCCESS,
        context: {
          participantPseudonym: "participant-a",
          remoteParticipantPseudonym: "participant-b",
          participantPairPseudonym: "pair-ab",
          datasetPseudonym: "dataset-a"
        }
      },
      {
        eventId: "event-2",
        timestamp: "2026-06-08T10:05:00.000Z",
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
        dimensions: [SemanticObservabilityDimension.STABILITY],
        status: SemanticObservabilityStatus.SUCCESS,
        context: {
          participantPseudonym: "participant-a",
          remoteParticipantPseudonym: "participant-c",
          participantPairPseudonym: "pair-ac",
          datasetPseudonym: "dataset-b"
        }
      }
    ];

    const snapshots = buildSemanticObservabilityMetricSnapshots(
      events,
      {},
      {
        bucket: SemanticObservabilitySnapshotBucket.HOUR
      }
    );

    expect(
      snapshots.some(
        (snapshot) => snapshot.participantPseudonym === "participant-a"
      )
    ).toBe(true);
    expect(
      snapshots.some(
        (snapshot) => snapshot.participantPairPseudonym === "pair-ab"
      )
    ).toBe(true);
    expect(
      snapshots.some((snapshot) => snapshot.datasetPseudonym === "dataset-b")
    ).toBe(true);
  });

  it("handles persisted events with Date timestamps", () => {
    const events = [
      {
        eventId: "event-1",
        timestamp: new Date("2026-06-08T10:00:00.000Z"),
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType:
          SemanticObservabilityEventType.DATASET_CONFIGURATION_OBSERVED,
        dimensions: [SemanticObservabilityDimension.ADOPTION],
        status: SemanticObservabilityStatus.SUCCESS,
        artefacts: [
          {
            type: SemanticArtefactType.SEMANTIC_MODEL,
            reference: "https://example.com/model"
          }
        ]
      }
    ] as unknown as SemanticObservabilityEvent[];

    const report = buildSemanticObservabilityReport(events);
    const snapshots = buildSemanticObservabilityMetricSnapshots(
      events,
      {},
      {
        bucket: SemanticObservabilitySnapshotBucket.DAY
      }
    );

    expect(report.timeWindowStart).toBe("2026-06-08T10:00:00.000Z");
    expect(snapshots[0].timeWindowStart).toBe("2026-06-08T00:00:00.000Z");
  });
});
