<script setup lang="ts">
import { formatDate } from "../utils/date";
import { toastError } from "../utils/error";
import http from "../utils/http";
import DatePicker from "primevue/datepicker";
import ProgressSpinner from "primevue/progressspinner";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref, watch } from "vue";

interface SemanticObservabilityMetric {
  timeWindowStart: string;
  timeWindowEnd: string;
  metricName: string;
  metricValue: number;
  count?: number;
  successCount?: number;
  failureCount?: number;
  eventCount?: number;
  averageLatencyMs?: number;
  datasetPseudonym?: string;
  datasetCategory?: string;
  participantPseudonym?: string;
  remoteParticipantPseudonym?: string;
  participantPairPseudonym?: string;
  artefactType?: string;
  artefactReference?: string;
  artefactVersion?: string;
}

interface SemanticObservabilityReport {
  generatedAt: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  adoption: SemanticObservabilityMetric[];
  friction: SemanticObservabilityMetric[];
  evolution: SemanticObservabilityMetric[];
  stability: SemanticObservabilityMetric[];
}

interface SemanticObservabilityEvent {
  eventId?: string;
  id?: string;
  timestamp: string;
  component: string;
  eventType: string;
  dimensions: string[];
  status: string;
  context?: Record<string, string | undefined>;
  artefacts?: Array<Record<string, string | undefined>>;
  failureCategory?: string;
  durationMs?: number;
  metadataCompletenessScore?: number;
  validationErrorCount?: number;
  attributes?: Record<string, string | number | boolean | null>;
}

interface SemanticObservabilitySnapshotRefreshStatus {
  enabled: boolean;
  intervalMs: number;
  buckets: string[];
  inProgress: boolean;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  refreshedSnapshots: number;
}

interface SemanticObservabilityInsight {
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  evidence: {
    totalEvents?: number;
    affectedEvents?: number;
    percentage?: number;
    artefactReference?: string;
    artefactVersion?: string;
    datasetPseudonym?: string;
    failureCategory?: string;
    metadataCompletenessScore?: number;
  };
}

interface GroupedRow {
  key: string;
  component?: string;
  eventType?: string;
  metricName?: string;
  status?: string;
  participantPseudonym?: string;
  remoteParticipantPseudonym?: string;
  datasetPseudonym?: string;
  failureCategory?: string;
  count: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  lastSeenAt: string;
}

interface TrendRow {
  bucketStart: string;
  total: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  adoptionCount: number;
  frictionCount: number;
  evolutionCount: number;
  stabilityCount: number;
}

interface ArtefactReference {
  type?: string;
  reference?: string;
  version?: string;
}

const toast = useToast();

const loadingReport = ref(false);
const loadingStatus = ref(false);
const refreshingSnapshots = ref(false);
const loadingEvents = ref(false);
const loadingInsights = ref(false);
const report = ref<SemanticObservabilityReport | undefined>();
const refreshStatus = ref<SemanticObservabilitySnapshotRefreshStatus>();
const events = ref<SemanticObservabilityEvent[]>([]);
const insights = ref<SemanticObservabilityInsight[]>([]);
const expandedRows = ref<Record<string, boolean>>({});
const selectedArtefact = ref<ArtefactReference | undefined>();
const selectedMetricName = ref<string | undefined>();
const selectedSignalName = ref<string | undefined>();
const filtersVisible = ref(true);
const dateRangeStart = new Date(2020, 0, 1);
const dateRangeEnd = new Date();
dateRangeEnd.setHours(23, 59, 59, 999);
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const dateRangeMaxDays = Math.max(
  1,
  Math.ceil(
    (dateRangeEnd.getTime() - dateRangeStart.getTime()) / millisecondsPerDay
  )
);
const dateRangeSlider = ref<number[]>([0, dateRangeMaxDays]);
const filters = ref({
  bucket: "day",
  component: undefined as string | undefined,
  eventType: undefined as string | undefined,
  status: undefined as string | undefined,
  metricName: undefined as string | undefined,
  participantA: undefined as string | undefined,
  participantB: undefined as string | undefined,
  datasetPseudonym: "",
  artefactType: undefined as string | undefined,
  artefactReference: "",
  artefactVersion: ""
});

const bucketOptions = [
  { label: "Day", value: "day" },
  { label: "Hour", value: "hour" }
];
const eventTypeOptions = [
  "catalog.metadata.observed",
  "dataset.configuration.observed",
  "dataset.metadata.changed",
  "metadata.validation.result",
  "policy.evaluation.result",
  "negotiation.state.changed",
  "transfer.state.changed",
  "data-plane.access.observed"
].map((value) => ({ label: signalLabel(value), value }));
const statusOptions = ["success", "failure", "warning", "info"].map(
  (value) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value
  })
);
const dataPlaneMetricNames = [
  "validation_error_rate",
  "transfer_failure_rate",
  "transfer_success_rate",
  "average_transfer_setup_latency",
  "data_plane_access_failure_rate",
  "data_plane_access_success_rate",
  "artefact_version_adoption_rate",
  "deprecated_artefact_usage_rate"
];
const artefactTypeOptions = [
  "semantic-model",
  "base-semantic-model",
  "ontology",
  "vocabulary",
  "schema",
  "openapi-spec",
  "dcat-profile",
  "csvw-metadata",
  "dqv-measurement",
  "policy-profile",
  "validation-rule",
  "mapping",
  "unknown"
].map((value) => ({ label: value, value }));
const statusSeverity: Record<string, string> = {
  success: "success",
  failure: "danger",
  warning: "warn",
  info: "info"
};
const insightSeverity: Record<SemanticObservabilityInsight["severity"], string> = {
  critical: "danger",
  warning: "warn",
  info: "info"
};
const metricEventTypes: Record<string, string[]> = {
  semantic_model_coverage: [
    "catalog.metadata.observed",
    "dataset.configuration.observed"
  ],
  schema_reference_coverage: [
    "catalog.metadata.observed",
    "dataset.configuration.observed"
  ],
  metadata_completeness_score: [
    "catalog.metadata.observed",
    "dataset.configuration.observed"
  ],
  validation_error_rate: ["metadata.validation.result"],
  policy_failure_count: ["policy.evaluation.result"],
  negotiation_success_rate: ["negotiation.state.changed"],
  negotiation_failure_rate: ["negotiation.state.changed"],
  transfer_success_rate: ["transfer.state.changed"],
  transfer_failure_rate: ["transfer.state.changed"],
  average_transfer_setup_latency: ["transfer.state.changed"],
  data_plane_access_success_rate: ["data-plane.access.observed"],
  data_plane_access_failure_rate: ["data-plane.access.observed"],
  artefact_version_adoption_rate: [
    "catalog.metadata.observed",
    "dataset.configuration.observed"
  ],
  deprecated_artefact_usage_rate: [
    "catalog.metadata.observed",
    "dataset.configuration.observed"
  ]
};

const dataSharingEventTypes = new Set([
  "policy.evaluation.result",
  "negotiation.state.changed",
  "transfer.state.changed",
  "data-plane.access.observed",
  "metadata.validation.result"
]);

const activeDashboardTitle = computed(() =>
  "HTTP Data Plane Observability"
);
const dashboardMetricNames = computed(() =>
  dataPlaneMetricNames
);
const metricOptions = computed(() =>
  dashboardMetricNames.value.map((value) => ({
    label: metricLabel(value),
    value
  }))
);
const selectedDateRange = computed(() => {
  const [fromOffset, toOffset] = dateRangeSlider.value;
  return [
    addDays(dateRangeStart, fromOffset),
    addDays(dateRangeStart, toOffset, true)
  ];
});
const dateRangePicker = computed<[Date, Date]>({
  get: () => selectedDateRange.value as [Date, Date],
  set: ([from, to]) => {
    dateRangeSlider.value = normalizeDateRangeOffsets(from, to);
  }
});

const queryParams = computed(() => {
  const [from, to] = selectedDateRange.value;
  const params: Record<string, string> = {
    bucket: filters.value.bucket
  };

  if (from) params.from = from.toISOString();
  if (to) params.to = to.toISOString();
  if (filters.value.metricName) params.metricName = filters.value.metricName;
  if (filters.value.datasetPseudonym) {
    params.datasetPseudonym = filters.value.datasetPseudonym;
  }
  if (filters.value.participantA && filters.value.participantB) {
    params.participantPseudonym = filters.value.participantA;
    params.remoteParticipantPseudonym = filters.value.participantB;
  }
  if (filters.value.artefactType) {
    params.artefactType = filters.value.artefactType;
  }
  if (filters.value.artefactReference) {
    params.artefactReference = filters.value.artefactReference;
  }
  if (filters.value.artefactVersion) {
    params.artefactVersion = filters.value.artefactVersion;
  }

  return params;
});

const allMetrics = computed(() => {
  if (!report.value) {
    return [];
  }
  const visibleMetricNames = new Set(dashboardMetricNames.value);

  return [
    ...report.value.adoption,
    ...report.value.friction,
    ...report.value.evolution,
    ...report.value.stability
  ].filter((metric) => {
    if (!visibleMetricNames.has(metric.metricName)) {
      return false;
    }
    if (
      filters.value.metricName &&
      metric.metricName !== filters.value.metricName
    ) {
      return false;
    }
    if (
      filters.value.artefactType &&
      metric.artefactType &&
      metric.artefactType !== filters.value.artefactType
    ) {
      return false;
    }
    return true;
  });
});

const participantOptions = computed(() =>
  uniqueSorted(
    events.value.flatMap((event) => [
      event.context?.participantPseudonym,
      event.context?.remoteParticipantPseudonym
    ])
  ).map((value) => ({ label: compactPseudonym(value), value }))
);

const filteredEvents = computed(() => {
  const [from, to] = selectedDateRange.value;
  const fromMs = from?.getTime();
  const toMs = to?.getTime();
  const metricEventFilter = filters.value.metricName
    ? metricEventTypes[filters.value.metricName]
    : undefined;

  return events.value.filter((event) => {
    const eventMs = Date.parse(event.timestamp);
    if (fromMs !== undefined && eventMs < fromMs) {
      return false;
    }
    if (toMs !== undefined && eventMs > toMs) {
      return false;
    }
    if (
      filters.value.component &&
      event.component !== filters.value.component
    ) {
      return false;
    }
    if (
      filters.value.eventType &&
      event.eventType !== filters.value.eventType
    ) {
      return false;
    }
    if (filters.value.status && event.status !== filters.value.status) {
      return false;
    }
    if (metricEventFilter && !metricEventFilter.includes(event.eventType)) {
      return false;
    }
    if (
      filters.value.datasetPseudonym &&
      event.context?.datasetPseudonym !== filters.value.datasetPseudonym
    ) {
      return false;
    }
    if (!matchesParticipantSelection(event)) {
      return false;
    }
    if (filters.value.artefactType || filters.value.artefactReference) {
      const artefactMatch = event.artefacts?.some((artefact) => {
        if (
          filters.value.artefactType &&
          artefact.type !== filters.value.artefactType
        ) {
          return false;
        }
        if (
          filters.value.artefactReference &&
          artefact.reference !== filters.value.artefactReference
        ) {
          return false;
        }
        return true;
      });
      if (!artefactMatch) {
        return false;
      }
    }
    return true;
  });
});

const dataSharingEvents = computed(() =>
  filteredEvents.value.filter((event) =>
    dataSharingEventTypes.has(event.eventType)
  )
);

const summaryMetrics = computed(() => {
  const total = filteredEvents.value.length;
  const dataSharingTotal = dataSharingEvents.value.length;
  const failures = countByStatus(filteredEvents.value, "failure");
  const successRate = total
    ? countByStatus(filteredEvents.value, "success") / total
    : 0;
  const dataSharingSuccessRate = dataSharingTotal
    ? countByStatus(dataSharingEvents.value, "success") / dataSharingTotal
    : 0;

  return [
    {
      name: "observed_events",
      label: "Observed Events",
      value: new Intl.NumberFormat().format(total),
      count: total
    },
    {
      name: "data_sharing_processes",
      label: "Data Sharing Processes",
      value: new Intl.NumberFormat().format(dataSharingTotal),
      count: dataSharingTotal
    },
    {
      name: "success_rate",
      label: "Success Rate",
      value: formatRate(successRate),
      count: total
    },
    {
      name: "failure_count",
      label: "Failures",
      value: new Intl.NumberFormat().format(failures),
      count: failures
    }
  ];
});

const dataSharingRows = computed(() =>
  groupEvents(dataSharingEvents.value, (event) => [
    event.component,
    event.eventType,
    event.context?.participantPseudonym ?? "",
    event.context?.remoteParticipantPseudonym ?? "",
    event.context?.datasetPseudonym ?? "",
    event.status,
    event.failureCategory ?? ""
  ])
);

const signalUsageRows = computed(() =>
  groupEvents(filteredEvents.value, (event) => [
    event.component,
    event.eventType,
    event.context?.participantPseudonym ?? "",
    event.context?.remoteParticipantPseudonym ?? "",
    event.context?.datasetPseudonym ?? "",
    event.status,
    event.failureCategory ?? ""
  ])
);

const eventTrendRows = computed<TrendRow[]>(() => {
  const groups = new Map<string, TrendRow>();
  for (const event of filteredEvents.value) {
    const bucketStart = getBucketStart(event.timestamp, filters.value.bucket);
    const current = groups.get(bucketStart) ?? {
      bucketStart,
      total: 0,
      successCount: 0,
      failureCount: 0,
      warningCount: 0,
      adoptionCount: 0,
      frictionCount: 0,
      evolutionCount: 0,
      stabilityCount: 0
    };

    current.total += 1;
    current.successCount += event.status === "success" ? 1 : 0;
    current.failureCount += event.status === "failure" ? 1 : 0;
    current.warningCount += event.status === "warning" ? 1 : 0;
    current.adoptionCount += event.dimensions.includes("adoption") ? 1 : 0;
    current.frictionCount += event.dimensions.includes("friction") ? 1 : 0;
    current.evolutionCount += event.dimensions.includes("evolution") ? 1 : 0;
    current.stabilityCount += event.dimensions.includes("stability") ? 1 : 0;
    groups.set(bucketStart, current);
  }
  return [...groups.values()].sort((a, b) =>
    a.bucketStart.localeCompare(b.bucketStart)
  );
});

const metricTrendRows = computed(() =>
  allMetrics.value
    .filter(
      (metric) =>
        !filters.value.metricName ||
        metric.metricName === filters.value.metricName
    )
    .sort((a, b) =>
      `${a.metricName}:${a.timeWindowStart}`.localeCompare(
        `${b.metricName}:${b.timeWindowStart}`
      )
    )
);
const activeMetricName = computed(
  () => selectedMetricName.value ?? filters.value.metricName
);
const activeSignalName = computed(
  () => selectedSignalName.value ?? filters.value.eventType
);
const activeArtefact = computed(() => {
  if (selectedArtefact.value) {
    return selectedArtefact.value;
  }
  if (
    !filters.value.artefactType &&
    !filters.value.artefactReference &&
    !filters.value.artefactVersion
  ) {
    return undefined;
  }
  return {
    type: filters.value.artefactType,
    reference: filters.value.artefactReference || undefined,
    version: filters.value.artefactVersion || undefined
  };
});
const hasActiveTrendDrilldown = computed(
  () => Boolean(activeMetricName.value) ||
    Boolean(activeSignalName.value) ||
    Boolean(activeArtefact.value)
);
const visibleInsights = computed(() => {
  if (!hasActiveTrendDrilldown.value) {
    return insights.value;
  }
  return insights.value.filter((insight) => insightMatchesActiveSelection(insight));
});
const selectedArtefactEvents = computed(() => {
  if (!activeArtefact.value) {
    return [];
  }
  return filteredEvents.value.filter((event) =>
    event.artefacts?.some((artefact) =>
      artefactMatchesSelection(artefact, activeArtefact.value)
    )
  );
});
const selectedArtefactTrendRows = computed(() =>
  groupEventsByBucket(selectedArtefactEvents.value)
);
const selectedArtefactTrendChart = computed(() => ({
  labels: selectedArtefactTrendRows.value.map((row) =>
    formatDateOnly(row.bucketStart)
  ),
  datasets: [
    {
      label: "Success",
      data: selectedArtefactTrendRows.value.map((row) => row.successCount),
      borderColor: "#22c55e",
      backgroundColor: "rgba(34, 197, 94, 0.18)",
      tension: 0.35
    },
    {
      label: "Failure",
      data: selectedArtefactTrendRows.value.map((row) => row.failureCount),
      borderColor: "#ef4444",
      backgroundColor: "rgba(239, 68, 68, 0.18)",
      tension: 0.35
    },
    {
      label: "Warning",
      data: selectedArtefactTrendRows.value.map((row) => row.warningCount),
      borderColor: "#eab308",
      backgroundColor: "rgba(234, 179, 8, 0.18)",
      tension: 0.35
    }
  ]
}));
const selectedTrendTitle = computed(() => {
  if (activeMetricName.value) {
    return metricLabel(activeMetricName.value);
  }
  if (activeSignalName.value) {
    return signalLabel(activeSignalName.value);
  }
  if (activeArtefact.value) {
    return artefactLabel(activeArtefact.value);
  }
  return "";
});
const selectedTrendCount = computed(() => {
  if (activeMetricName.value) {
    return metricTrendRows.value.filter(
      (metric) => metric.metricName === activeMetricName.value
    ).length;
  }
  return selectedTrendEvents.value.length;
});
const selectedTrendEvents = computed(() => {
  if (activeSignalName.value) {
    return filteredEvents.value.filter(
      (event) => event.eventType === activeSignalName.value
    );
  }
  return selectedArtefactEvents.value;
});
const selectedTrendChartKey = computed(() =>
  [
    activeMetricName.value,
    activeSignalName.value,
    activeArtefact.value?.type,
    activeArtefact.value?.reference,
    activeArtefact.value?.version,
    filters.value.bucket,
    selectedDateRange.value.map((date) => date.toISOString()).join(":")
  ].join("|")
);
const selectedTrendChart = computed(() => {
  if (activeMetricName.value) {
    const metrics = metricTrendRows.value.filter(
      (metric) => metric.metricName === activeMetricName.value
    );
    return {
      datasets: [
        {
          label: metricLabel(activeMetricName.value),
          data: metrics.map((metric) =>
            trendPoint(metric.timeWindowStart, trendMetricValue(metric))
          ),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.18)",
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }
  const rows = groupEventsByBucket(selectedTrendEvents.value);
  return {
    datasets: selectedArtefactTrendChart.value.datasets.map((dataset) => ({
      ...dataset,
      pointRadius: 4,
      pointHoverRadius: 6,
      data:
        dataset.label === "Success"
          ? rows.map((row) => trendPoint(row.bucketStart, row.successCount))
          : dataset.label === "Failure"
            ? rows.map((row) => trendPoint(row.bucketStart, row.failureCount))
            : rows.map((row) => trendPoint(row.bucketStart, row.warningCount))
    }))
  };
});
const trendChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 8,
      right: 12,
      bottom: 8,
      left: 4
    }
  },
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    x: {
      type: "linear",
      min: selectedDateRange.value[0].getTime(),
      max: selectedDateRange.value[1].getTime(),
      bounds: "ticks",
      grid: {
        drawTicks: true
      },
      offset: true,
      ticks: {
        maxTicksLimit: 4,
        autoSkip: true,
        maxRotation: 0,
        minRotation: 0,
        callback: (value: string | number) => formatDateOnly(Number(value))
      }
    },
    y: {
      beginAtZero: true,
      min: 0,
      max: 100,
      bounds: "ticks",
      ticks: {
        precision: 0,
        stepSize: 20,
        includeBounds: true
      }
    }
  }
}));

async function loadReport() {
  loadingReport.value = true;
  try {
    const response = await getObservability<SemanticObservabilityReport>(
      "report/snapshots",
      { params: queryParams.value }
    );
    report.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Semantic observability",
        defaultMessage: "Could not load semantic observability report"
      })
    );
  } finally {
    loadingReport.value = false;
  }
}

async function loadInsights() {
  loadingInsights.value = true;
  try {
    const response = await getObservability<SemanticObservabilityInsight[]>(
      "insights",
      { params: queryParams.value }
    );
    insights.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Semantic observability",
        defaultMessage: "Could not load semantic observability insights"
      })
    );
  } finally {
    loadingInsights.value = false;
  }
}

async function loadSnapshotStatus() {
  loadingStatus.value = true;
  try {
    const response =
      await getObservability<SemanticObservabilitySnapshotRefreshStatus>(
        "report/snapshots/status"
      );
    refreshStatus.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Semantic observability",
        defaultMessage: "Could not load semantic observability refresh status"
      })
    );
  } finally {
    loadingStatus.value = false;
  }
}

async function refreshSnapshots() {
  refreshingSnapshots.value = true;
  try {
    await postObservability("report/snapshots/refresh", queryParams.value);
    await Promise.all([loadReport(), loadSnapshotStatus()]);
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Semantic observability",
        defaultMessage: "Could not refresh semantic observability snapshots"
      })
    );
  } finally {
    refreshingSnapshots.value = false;
  }
}

async function loadEvents() {
  loadingEvents.value = true;
  try {
    const response = await getObservability<{
      data?: SemanticObservabilityEvent[];
    }>("events", {
      params: {
        page: 1,
        take: 50,
        per_page: 100,
        order: "DESC",
        order_by: "timestamp"
      }
    });
    events.value = response.data.data ?? [];
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Semantic observability",
        defaultMessage: "Could not load semantic observability events"
      })
    );
  } finally {
    loadingEvents.value = false;
  }
}

async function getObservability<T>(
  path: string,
  config?: { params?: Record<string, string | number | undefined> }
) {
  return await http.get<T>(`management/semantic-observability/${path}`, config);
}

async function postObservability(
  path: string,
  params?: Record<string, string>
) {
  return await http.post(`management/semantic-observability/${path}`, null, {
    params
  });
}

async function reloadDashboard() {
  await Promise.all([loadReport(), loadEvents(), loadInsights()]);
}

function resetFilters() {
  dateRangeSlider.value = [0, dateRangeMaxDays];
  clearTrendDrilldown();
  filters.value = {
    bucket: "day",
    component: undefined,
    eventType: undefined,
    status: undefined,
    metricName: undefined,
    participantA: undefined,
    participantB: undefined,
    datasetPseudonym: "",
    artefactType: undefined,
    artefactReference: "",
    artefactVersion: ""
  };
}

function matchesParticipantSelection(event: SemanticObservabilityEvent) {
  const selected = [filters.value.participantA, filters.value.participantB]
    .filter(Boolean)
    .map(String);
  if (selected.length === 0) {
    return true;
  }

  const participants = new Set([
    event.context?.participantPseudonym,
    event.context?.remoteParticipantPseudonym
  ]);

  return selected.every((participant) => participants.has(participant));
}

function groupEvents(
  sourceEvents: SemanticObservabilityEvent[],
  keyFactory: (event: SemanticObservabilityEvent) => string[]
): GroupedRow[] {
  const groups = new Map<string, GroupedRow>();
  for (const event of sourceEvents) {
    const keyParts = keyFactory(event);
    const key = keyParts.join("|");
    const current = groups.get(key) ?? {
      key,
      component: event.component,
      eventType: event.eventType,
      status: event.status,
      participantPseudonym: event.context?.participantPseudonym,
      remoteParticipantPseudonym: event.context?.remoteParticipantPseudonym,
      datasetPseudonym: event.context?.datasetPseudonym,
      failureCategory: event.failureCategory,
      count: 0,
      successCount: 0,
      failureCount: 0,
      warningCount: 0,
      lastSeenAt: event.timestamp
    };

    current.count += 1;
    current.successCount += event.status === "success" ? 1 : 0;
    current.failureCount += event.status === "failure" ? 1 : 0;
    current.warningCount += event.status === "warning" ? 1 : 0;
    if (event.timestamp > current.lastSeenAt) {
      current.lastSeenAt = event.timestamp;
    }
    groups.set(key, current);
  }

  return [...groups.values()].sort((a, b) =>
    b.lastSeenAt.localeCompare(a.lastSeenAt)
  );
}

function groupEventsByBucket(sourceEvents: SemanticObservabilityEvent[]) {
  const groups = new Map<string, TrendRow>();
  for (const event of sourceEvents) {
    const bucketStart = getBucketStart(event.timestamp, filters.value.bucket);
    const current = groups.get(bucketStart) ?? {
      bucketStart,
      total: 0,
      successCount: 0,
      failureCount: 0,
      warningCount: 0,
      adoptionCount: 0,
      frictionCount: 0,
      evolutionCount: 0,
      stabilityCount: 0
    };

    current.total += 1;
    current.successCount += event.status === "success" ? 1 : 0;
    current.failureCount += event.status === "failure" ? 1 : 0;
    current.warningCount += event.status === "warning" ? 1 : 0;
    current.adoptionCount += event.dimensions.includes("adoption") ? 1 : 0;
    current.frictionCount += event.dimensions.includes("friction") ? 1 : 0;
    current.evolutionCount += event.dimensions.includes("evolution") ? 1 : 0;
    current.stabilityCount += event.dimensions.includes("stability") ? 1 : 0;
    groups.set(bucketStart, current);
  }
  return [...groups.values()].sort((a, b) =>
    a.bucketStart.localeCompare(b.bucketStart)
  );
}

function countByStatus(
  sourceEvents: SemanticObservabilityEvent[],
  status: string
) {
  return sourceEvents.filter((event) => event.status === status).length;
}

function metricLabel(metricName: string) {
  return metricName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function signalLabel(eventType: string) {
  return eventType
    .split(".")
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function formatMetricValue(metric: SemanticObservabilityMetric) {
  if (metric.metricName.includes("latency")) {
    return `${Math.round(metric.metricValue)} ms`;
  }
  if (
    metric.metricName.includes("rate") ||
    metric.metricName.includes("coverage") ||
    metric.metricName.includes("score")
  ) {
    return formatRate(metric.metricValue);
  }
  return new Intl.NumberFormat().format(metric.metricValue);
}

function trendMetricValue(metric: SemanticObservabilityMetric) {
  if (
    metric.metricName.includes("rate") ||
    metric.metricName.includes("coverage") ||
    metric.metricName.includes("score")
  ) {
    return Math.round(metric.metricValue * 100);
  }
  return metric.metricValue;
}

function trendPoint(timestamp: string, value: number) {
  return {
    x: new Date(timestamp).getTime(),
    y: value
  };
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

function compactPseudonym(value: string) {
  if (value.length <= 18) {
    return value;
  }
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function uniqueSorted(values: Array<string | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value)))
  ].sort();
}

function getBucketStart(timestamp: string, bucket: string) {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  if (bucket === "day") {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date.toISOString();
}

function trendWidth(value: number, max: number) {
  if (max <= 0) {
    return "0%";
  }
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
}

function eventKey(event: SemanticObservabilityEvent) {
  return event.eventId ?? event.id ?? event.timestamp;
}

function json(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function selectArtefact(artefact: ArtefactReference) {
  selectedArtefact.value = artefact;
  selectedMetricName.value = undefined;
  selectedSignalName.value = undefined;
  filters.value.metricName = undefined;
  filters.value.eventType = undefined;
  filters.value.artefactType = artefact.type;
  filters.value.artefactReference = artefact.reference ?? "";
  filters.value.artefactVersion = artefact.version ?? "";
}

function selectMetric(metricName: string) {
  selectedMetricName.value = metricName;
  selectedSignalName.value = undefined;
  selectedArtefact.value = undefined;
  filters.value.metricName = metricName;
  filters.value.eventType = undefined;
  filters.value.artefactType = undefined;
  filters.value.artefactReference = "";
  filters.value.artefactVersion = "";
}

function selectSignal(eventType: string) {
  selectedSignalName.value = eventType;
  selectedMetricName.value = undefined;
  selectedArtefact.value = undefined;
  filters.value.eventType = eventType;
  filters.value.metricName = undefined;
  filters.value.artefactType = undefined;
  filters.value.artefactReference = "";
  filters.value.artefactVersion = "";
}

function clearTrendDrilldown() {
  selectedArtefact.value = undefined;
  selectedMetricName.value = undefined;
  selectedSignalName.value = undefined;
  filters.value.metricName = undefined;
  filters.value.eventType = undefined;
  filters.value.artefactType = undefined;
  filters.value.artefactReference = "";
  filters.value.artefactVersion = "";
}

function artefactLabel(artefact: ArtefactReference) {
  return [
    artefact.type,
    artefact.reference,
    artefact.version ? `v${artefact.version}` : undefined
  ]
    .filter(Boolean)
    .join(" | ");
}

function artefactMatchesSelection(
  artefact: Record<string, string | undefined>,
  selected: ArtefactReference | undefined
) {
  if (!selected) {
    return false;
  }
  return (
    artefact.type === selected.type &&
    artefact.reference === selected.reference &&
    (selected.version ? artefact.version === selected.version : true)
  );
}

function formatDateOnly(value: Date | string | number | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function addDays(date: Date, days: number, endOfDay = false) {
  const result = new Date(date);
  result.setDate(result.getDate() + Math.round(days));
  if (endOfDay) {
    result.setHours(23, 59, 59, 999);
  } else {
    result.setHours(0, 0, 0, 0);
  }
  return result;
}

function normalizeDateRangeOffsets(from?: Date, to?: Date) {
  const startOffset = dateToOffset(from ?? dateRangeStart);
  const endOffset = dateToOffset(to ?? dateRangeEnd);
  return startOffset <= endOffset
    ? [startOffset, endOffset]
    : [endOffset, startOffset];
}

function dateToOffset(date: Date) {
  return Math.min(
    dateRangeMaxDays,
    Math.max(
      0,
      Math.round(
        (date.getTime() - dateRangeStart.getTime()) / millisecondsPerDay
      )
    )
  );
}

function insightMatchesActiveSelection(insight: SemanticObservabilityInsight) {
  if (
    activeMetricName.value &&
    !insightMatchesMetric(insight, activeMetricName.value)
  ) {
    return false;
  }
  if (
    activeSignalName.value &&
    !insightMatchesSignal(insight, activeSignalName.value)
  ) {
    return false;
  }
  if (
    activeArtefact.value &&
    !insightMatchesArtefact(insight, activeArtefact.value)
  ) {
    return false;
  }
  return true;
}

function insightMatchesMetric(
  insight: SemanticObservabilityInsight,
  metricName: string
) {
  const insightKindsByMetric: Record<string, string[]> = {
    semantic_model_coverage: ["unused-artefact", "low-metadata-completeness"],
    schema_reference_coverage: ["unused-artefact", "low-metadata-completeness"],
    metadata_completeness_score: ["low-metadata-completeness"],
    validation_error_rate: [
      "validation-version-hotspot",
      "validation-dataset-hotspot",
      "failure-category-hotspot"
    ],
    policy_failure_count: ["failure-category-hotspot"],
    negotiation_failure_rate: ["failure-category-hotspot"],
    negotiation_success_rate: ["failure-category-hotspot"],
    transfer_failure_rate: ["failure-category-hotspot"],
    transfer_success_rate: ["failure-category-hotspot"],
    average_transfer_setup_latency: ["failure-category-hotspot"],
    data_plane_access_failure_rate: ["failure-category-hotspot"],
    data_plane_access_success_rate: ["failure-category-hotspot"],
    artefact_version_adoption_rate: [
      "validation-version-hotspot",
      "unused-artefact"
    ],
    deprecated_artefact_usage_rate: ["unused-artefact"]
  };
  return insightKindsByMetric[metricName]?.includes(insight.kind) ?? false;
}

function insightMatchesSignal(
  insight: SemanticObservabilityInsight,
  eventType: string
) {
  const insightKindsBySignal: Record<string, string[]> = {
    "catalog.metadata.observed": [
      "low-metadata-completeness",
      "unused-artefact"
    ],
    "dataset.configuration.observed": [
      "low-metadata-completeness",
      "unused-artefact"
    ],
    "dataset.metadata.changed": [
      "low-metadata-completeness",
      "unused-artefact"
    ],
    "metadata.validation.result": [
      "validation-version-hotspot",
      "validation-dataset-hotspot",
      "failure-category-hotspot"
    ],
    "policy.evaluation.result": ["failure-category-hotspot"],
    "negotiation.state.changed": ["failure-category-hotspot"],
    "transfer.state.changed": ["failure-category-hotspot"],
    "data-plane.access.observed": ["failure-category-hotspot"]
  };
  return insightKindsBySignal[eventType]?.includes(insight.kind) ?? false;
}

function insightMatchesArtefact(
  insight: SemanticObservabilityInsight,
  artefact: ArtefactReference
) {
  const evidence = insight.evidence;
  if (
    artefact.reference &&
    evidence.artefactReference !== artefact.reference
  ) {
    return false;
  }
  if (artefact.version && evidence.artefactVersion !== artefact.version) {
    return false;
  }
  return Boolean(evidence.artefactReference || evidence.artefactVersion);
}

function insightEvidence(insight: SemanticObservabilityInsight) {
  const evidence = insight.evidence;
  return [
    evidence.percentage !== undefined ? `${evidence.percentage}%` : undefined,
    evidence.affectedEvents !== undefined && evidence.totalEvents !== undefined
      ? `${evidence.affectedEvents}/${evidence.totalEvents} events`
      : undefined,
    evidence.datasetPseudonym
      ? `dataset ${compactPseudonym(evidence.datasetPseudonym)}`
      : undefined,
    evidence.artefactVersion ? `version ${evidence.artefactVersion}` : undefined,
    evidence.failureCategory
  ]
    .filter(Boolean)
    .join(" | ");
}

watch(
  queryParams,
  () => {
    loadReport();
    loadInsights();
  },
  { deep: true }
);

onMounted(async () => {
  await Promise.all([
    loadReport(),
    loadSnapshotStatus(),
    loadEvents(),
    loadInsights()
  ]);
});
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold m-0">
          {{ activeDashboardTitle }}
        </h2>
      </div>
      <Button
        icon="pi pi-filter"
        label="Filters"
        severity="secondary"
        outlined
        @click="filtersVisible = true" />
    </div>

    <div
      class="semantic-observability-page"
      :class="{ 'filters-open': filtersVisible }">
    <div class="grid grid-cols-12 gap-4">
      <Card
        v-for="metric in summaryMetrics"
        :key="metric.name"
        class="col-span-12 md:col-span-6 xl:col-span-3">
        <template #content>
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="block text-muted-color font-medium mb-3">{{
                metric.label
              }}</span>
              <div
                class="text-surface-900 dark:text-surface-0 font-semibold text-2xl">
                {{ metric.value }}
              </div>
              <div class="text-sm text-muted-color mt-2">
                {{ metric.count }} observations
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-surface-100 dark:bg-surface-800 rounded-border"
              style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-chart-bar text-primary !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <Card>
      <template #title>Insights</template>
      <template #content>
        <div v-if="loadingInsights" class="flex items-center gap-2">
          <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
          <span class="text-muted-color">Loading insights</span>
        </div>
        <div
          v-else-if="visibleInsights.length === 0"
          class="text-muted-color">
          No diagnostic insights for the selected filters.
        </div>
        <div v-else class="grid grid-cols-12 gap-3">
          <div
            v-for="insight in visibleInsights"
            :key="`${insight.kind}:${insight.title}`"
            class="col-span-12 lg:col-span-6 xl:col-span-4 border border-surface-200 dark:border-surface-700 rounded p-3">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="font-semibold">{{ insight.title }}</div>
              <Tag
                :severity="insightSeverity[insight.severity]"
                :value="insight.severity" />
            </div>
            <div class="text-sm text-muted-color">
              {{ insight.description }}
            </div>
            <div
              v-if="insightEvidence(insight)"
              class="text-xs text-muted-color mt-3">
              {{ insightEvidence(insight) }}
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Card>
      <template #title>Snapshot Status</template>
      <template #content>
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap gap-2">
            <Button
              icon="pi pi-refresh"
              label="Refresh snapshots"
              :loading="refreshingSnapshots"
              @click="refreshSnapshots" />
            <Button
              icon="pi pi-search"
              label="Reload"
              severity="secondary"
              :loading="loadingReport || loadingEvents"
              @click="reloadDashboard" />
          </div>
          <div
            class="grid grid-cols-12 gap-3 p-3 surface-ground rounded-lg text-sm">
            <div class="col-span-12 md:col-span-3">
              <div class="text-muted-color mb-1">Automatic refresh</div>
              <Tag
                :severity="refreshStatus?.enabled ? 'success' : 'secondary'"
                :value="refreshStatus?.enabled ? 'Enabled' : 'Disabled'" />
              <Tag
                v-if="refreshStatus?.inProgress || loadingStatus"
                class="ml-2"
                severity="info"
                value="Running" />
            </div>
            <div class="col-span-12 md:col-span-3">
              <div class="text-muted-color mb-1">Interval</div>
              <span>{{
                refreshStatus
                  ? `${Math.round(refreshStatus.intervalMs / 60000)} min`
                  : "-"
              }}</span>
            </div>
            <div class="col-span-12 md:col-span-3">
              <div class="text-muted-color mb-1">Last completed</div>
              <span>{{ formatDate(refreshStatus?.lastCompletedAt) }}</span>
            </div>
            <div class="col-span-12 md:col-span-3">
              <div class="text-muted-color mb-1">Loaded events</div>
              <span>{{ filteredEvents.length }} / {{ events.length }}</span>
            </div>
            <div v-if="refreshStatus?.lastError" class="col-span-12">
              <Tag severity="danger" :value="refreshStatus.lastError" />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <aside
      v-if="filtersVisible"
      class="semantic-filter-panel rounded border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div class="font-semibold text-lg">Filters</div>
        <Button
          icon="pi pi-angle-right"
          label="Collapse"
          severity="secondary"
          aria-label="Hide filters"
          @click="filtersVisible = false" />
      </div>
        <div class="flex flex-col gap-4">
          <div class="semantic-filter-fields">
            <div>
              <label class="block text-sm font-semibold mb-1">Bucket</label>
              <Select
                v-model="filters.bucket"
                :options="bucketOptions"
                option-label="label"
                option-value="value"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Signal</label>
              <Select
                v-model="filters.eventType"
                :options="eventTypeOptions"
                option-label="label"
                option-value="value"
                show-clear
                filter
                placeholder="All signals"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Metric</label>
              <Select
                v-model="filters.metricName"
                :options="metricOptions"
                option-label="label"
                option-value="value"
                show-clear
                filter
                placeholder="All metrics"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Participant A</label
              >
              <Select
                v-model="filters.participantA"
                :options="participantOptions"
                option-label="label"
                option-value="value"
                show-clear
                filter
                placeholder="Any participant"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Participant B</label
              >
              <Select
                v-model="filters.participantB"
                :options="participantOptions"
                option-label="label"
                option-value="value"
                show-clear
                filter
                placeholder="Any participant"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Date range</label>
              <div class="semantic-date-range">
                <div
                  class="semantic-date-labels flex justify-between gap-3 text-sm text-muted-color">
                  <span>{{ formatDateOnly(selectedDateRange[0]) }}</span>
                  <span>{{ formatDateOnly(selectedDateRange[1]) }}</span>
                </div>
                <Slider
                  v-model="dateRangeSlider"
                  range
                  :min="0"
                  :max="dateRangeMaxDays"
                  :step="1"
                  class="mt-4" />
                <DatePicker
                  v-model="dateRangePicker"
                  selection-mode="range"
                  :manual-input="false"
                  :min-date="dateRangeStart"
                  :max-date="dateRangeEnd"
                  show-icon
                  icon-display="input"
                  class="w-full mt-4"
                  fluid />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Status</label>
              <Select
                v-model="filters.status"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                show-clear
                placeholder="Any status"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Dataset</label>
              <InputText
                v-model="filters.datasetPseudonym"
                class="w-full"
                placeholder="Dataset pseudonym" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1"
                >Artefact type</label
              >
              <Select
                v-model="filters.artefactType"
                :options="artefactTypeOptions"
                option-label="label"
                option-value="value"
                show-clear
                filter
                placeholder="Any type"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1">Version</label>
              <InputText
                v-model="filters.artefactVersion"
                class="w-full"
                placeholder="Artefact version" />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              icon="pi pi-times"
              label="Clear"
              severity="secondary"
              outlined
              @click="resetFilters" />
          </div>
        </div>
    </aside>

    <div v-if="loadingReport || loadingEvents" class="flex justify-center py-4">
      <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
    </div>

    <Tabs v-else value="metrics">
      <TabList>
        <Tab value="metrics">Metrics</Tab>
        <Tab value="sharing">Data sharing</Tab>
        <Tab value="signals">Signals</Tab>
        <Tab value="trends">Trends</Tab>
        <Tab value="events">Events</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="metrics">
          <DataTable
            :value="allMetrics"
            size="small"
            striped-rows
            paginator
            :rows="12"
            data-key="metricName">
            <Column field="metricName" header="Metric">
              <template #body="props">
                <Button
                  :label="metricLabel(props.data.metricName)"
                  icon="pi pi-chart-line"
                  text
                  class="p-0"
                  @click="selectMetric(props.data.metricName)" />
              </template>
            </Column>
            <Column field="metricValue" header="Value">
              <template #body="props">
                <Tag severity="info" :value="formatMetricValue(props.data)" />
              </template>
            </Column>
            <Column field="count" header="Count">
              <template #body="props">
                {{ props.data.count ?? props.data.eventCount ?? 0 }}
              </template>
            </Column>
            <Column field="successCount" header="Success" />
            <Column field="failureCount" header="Failure" />
            <Column field="timeWindowStart" header="Window">
              <template #body="props">
                {{ formatDate(props.data.timeWindowStart) }}
              </template>
            </Column>
            <template #empty>No metrics.</template>
          </DataTable>
        </TabPanel>

        <TabPanel value="sharing">
          <DataTable
            :value="dataSharingRows"
            size="small"
            striped-rows
            paginator
            :rows="12"
            data-key="key">
            <Column field="component" header="Component" />
            <Column field="eventType" header="Process">
              <template #body="props">
                {{ signalLabel(props.data.eventType) }}
              </template>
            </Column>
            <Column field="participantPseudonym" header="Participant" />
            <Column field="remoteParticipantPseudonym" header="Remote" />
            <Column field="datasetPseudonym" header="Dataset" />
            <Column field="status" header="Status">
              <template #body="props">
                <Tag
                  :severity="statusSeverity[props.data.status] ?? 'secondary'"
                  :value="props.data.status" />
              </template>
            </Column>
            <Column field="failureCategory" header="Failure category" />
            <Column field="count" header="Count" />
            <Column field="lastSeenAt" header="Last seen">
              <template #body="props">
                {{ formatDate(props.data.lastSeenAt, true) }}
              </template>
            </Column>
            <template #empty>No data sharing signals.</template>
          </DataTable>
        </TabPanel>

        <TabPanel value="signals">
          <DataTable
            :value="signalUsageRows"
            size="small"
            striped-rows
            paginator
            :rows="12"
            data-key="key">
            <Column field="component" header="Component" />
            <Column field="eventType" header="Signal">
              <template #body="props">
                <Button
                  :label="signalLabel(props.data.eventType)"
                  icon="pi pi-chart-line"
                  text
                  class="p-0"
                  @click="selectSignal(props.data.eventType)" />
              </template>
            </Column>
            <Column field="participantPseudonym" header="Participant" />
            <Column field="remoteParticipantPseudonym" header="Remote" />
            <Column field="datasetPseudonym" header="Dataset" />
            <Column field="successCount" header="Success" />
            <Column field="failureCount" header="Failure" />
            <Column field="warningCount" header="Warning" />
            <Column field="count" header="Total" />
            <Column field="lastSeenAt" header="Last seen">
              <template #body="props">
                {{ formatDate(props.data.lastSeenAt, true) }}
              </template>
            </Column>
            <template #empty>No signal usage.</template>
          </DataTable>
        </TabPanel>

        <TabPanel value="trends">
          <div class="grid grid-cols-12 gap-4">
            <Card class="col-span-12">
              <template #title>Trend Drilldown</template>
              <template #content>
                <div v-if="!hasActiveTrendDrilldown" class="text-muted-color">
                  Select a metric, signal, or artefact to inspect its trend.
                </div>
                <div v-else class="flex flex-col gap-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div class="font-semibold">
                        {{ selectedTrendTitle }}
                      </div>
                      <div class="text-sm text-muted-color">
                        {{ selectedTrendCount }} matching observations in
                        the selected date range
                      </div>
                    </div>
                    <Button
                      icon="pi pi-times"
                      label="Clear drilldown"
                      severity="secondary"
                      outlined
                      @click="clearTrendDrilldown" />
                  </div>
                  <div class="semantic-trend-chart">
                    <Chart
                      :key="selectedTrendChartKey"
                      type="line"
                      :data="selectedTrendChart"
                      :options="trendChartOptions" />
                  </div>
                </div>
              </template>
            </Card>
            <div class="col-span-12 xl:col-span-5">
              <DataTable
                :value="eventTrendRows"
                size="small"
                striped-rows
                data-key="bucketStart">
                <Column field="bucketStart" header="Window">
                  <template #body="props">
                    {{ formatDate(props.data.bucketStart) }}
                  </template>
                </Column>
                <Column field="total" header="Events" />
                <Column field="successCount" header="Success" />
                <Column field="failureCount" header="Failure" />
                <Column header="Trend">
                  <template #body="props">
                    <div
                      class="flex h-3 overflow-hidden rounded bg-surface-200">
                      <div
                        class="bg-green-500"
                        :style="{
                          width: trendWidth(
                            props.data.successCount,
                            props.data.total
                          )
                        }"></div>
                      <div
                        class="bg-red-500"
                        :style="{
                          width: trendWidth(
                            props.data.failureCount,
                            props.data.total
                          )
                        }"></div>
                      <div
                        class="bg-yellow-500"
                        :style="{
                          width: trendWidth(
                            props.data.warningCount,
                            props.data.total
                          )
                        }"></div>
                    </div>
                  </template>
                </Column>
                <template #empty>No event trend.</template>
              </DataTable>
            </div>
            <div class="col-span-12 xl:col-span-7">
              <DataTable
                :value="metricTrendRows"
                size="small"
                striped-rows
                paginator
                :rows="10"
                data-key="metricName">
                <Column field="metricName" header="Metric">
                  <template #body="props">
                    <Button
                      :label="metricLabel(props.data.metricName)"
                      icon="pi pi-chart-line"
                      text
                      class="p-0"
                      @click="selectMetric(props.data.metricName)" />
                  </template>
                </Column>
                <Column field="timeWindowStart" header="Window">
                  <template #body="props">
                    {{ formatDate(props.data.timeWindowStart) }}
                  </template>
                </Column>
                <Column field="metricValue" header="Value">
                  <template #body="props">
                    <Tag
                      severity="info"
                      :value="formatMetricValue(props.data)" />
                  </template>
                </Column>
                <Column field="count" header="Count">
                  <template #body="props">
                    {{ props.data.count ?? props.data.eventCount ?? 0 }}
                  </template>
                </Column>
                <template #empty>No metric trend.</template>
              </DataTable>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="events">
          <DataTable
            v-model:expanded-rows="expandedRows"
            :value="filteredEvents"
            paginator
            :rows="15"
            :loading="loadingEvents"
            data-key="eventId"
            striped-rows>
            <template #header>
              <div class="flex justify-end">
                <Button
                  icon="pi pi-refresh"
                  label="Refresh events"
                  text
                  size="small"
                  :loading="loadingEvents"
                  @click="loadEvents()" />
              </div>
            </template>
            <Column expander style="width: 4rem" />
            <Column field="timestamp" header="Time">
              <template #body="props">
                {{ formatDate(props.data.timestamp, true) }}
              </template>
            </Column>
            <Column field="component" header="Component" />
            <Column field="eventType" header="Signal">
              <template #body="props">
                <Button
                  :label="signalLabel(props.data.eventType)"
                  icon="pi pi-chart-line"
                  text
                  class="p-0"
                  @click="selectSignal(props.data.eventType)" />
              </template>
            </Column>
            <Column field="status" header="Status">
              <template #body="props">
                <Tag
                  :severity="statusSeverity[props.data.status] ?? 'secondary'"
                  :value="props.data.status" />
              </template>
            </Column>
            <Column field="dimensions" header="Dimensions">
              <template #body="props">
                <div class="flex flex-wrap gap-1">
                  <Tag
                    v-for="dimension in props.data.dimensions"
                    :key="dimension"
                    severity="secondary"
                    :value="dimension" />
                </div>
              </template>
            </Column>
            <template #expansion="props">
              <div class="grid grid-cols-12 gap-4 p-3">
                <div class="col-span-12 md:col-span-6">
                  <h4 class="font-semibold mb-2">Context</h4>
                  <pre class="text-sm overflow-auto">{{
                    json(props.data.context)
                  }}</pre>
                </div>
                <div class="col-span-12 md:col-span-6">
                  <h4 class="font-semibold mb-2">Artefacts</h4>
                  <div
                    v-if="props.data.artefacts?.length"
                    class="flex flex-col gap-2">
                    <Button
                      v-for="artefact in props.data.artefacts"
                      :key="artefactLabel(artefact)"
                      :label="artefactLabel(artefact)"
                      icon="pi pi-chart-line"
                      severity="secondary"
                      outlined
                      class="justify-start text-left"
                      @click="selectArtefact(artefact)" />
                  </div>
                  <span v-else class="text-sm text-muted-color">
                    No artefacts.
                  </span>
                </div>
                <div class="col-span-12">
                  <h4 class="font-semibold mb-2">Attributes</h4>
                  <pre class="text-sm overflow-auto">{{
                    json(props.data.attributes)
                  }}</pre>
                </div>
                <div class="col-span-12 text-sm text-muted-color">
                  {{ eventKey(props.data) }}
                </div>
              </div>
            </template>
            <template #empty>No events.</template>
          </DataTable>
        </TabPanel>
      </TabPanels>
    </Tabs>
    </div>
  </div>
</template>

<style scoped>
.semantic-observability-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.semantic-observability-page.filters-open {
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
}

.semantic-observability-page > :not(.semantic-filter-panel) {
  grid-column: 1;
}

.semantic-filter-panel {
  grid-column: 2;
  grid-row: 1 / span 20;
  position: sticky;
  top: 1rem;
  height: calc(100vh - 2rem);
  overflow: auto;
  align-self: start;
}

.semantic-date-labels {
  min-height: 1.25rem;
  white-space: nowrap;
}

.semantic-date-labels span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.semantic-filter-fields {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.semantic-trend-chart {
  height: 13.5rem;
  min-height: 13.5rem;
  position: relative;
  width: 100%;
}

.semantic-trend-chart :deep(.p-chart) {
  height: 13.5rem;
  width: 100%;
}

.semantic-trend-chart canvas {
  height: 13.5rem !important;
  width: 100% !important;
}

@media (max-width: 1200px) {
  .semantic-observability-page.filters-open {
    grid-template-columns: minmax(0, 1fr);
  }

  .semantic-filter-panel {
    grid-column: 1;
    grid-row: auto;
    position: static;
    height: auto;
  }
}
</style>
