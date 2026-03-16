import type {
  AlgorithmEventDto,
  AlgorithmInstanceDto,
  InternalEventDto
} from "../types.js";
import type { InkColor } from "../utils.js";
import { formatDateWithSeconds, instanceStatusColor } from "../utils.js";

export type EventFilter = "all" | "algorithm" | "internal";
export type DetailView = "info" | "events" | "data" | "logs";

export interface MergedEvent {
  timestamp: string;
  type: "algorithm" | "internal";
  name: string;
  number: number;
  details: string;
  eventId?: string;
  data?: unknown;
}

export interface LatestInternalEventValue {
  name: string;
  value: string;
}

export interface InstanceInfoRow {
  label: string;
  value: string;
  color?: InkColor;
}

function formatInternalEventDetails(data: unknown): string {
  if (data && typeof data === "object") {
    if ("value" in data && Object.keys(data).length === 1) {
      return JSON.stringify((data as { value: unknown }).value).slice(0, 50);
    }

    return JSON.stringify(data).slice(0, 50);
  }

  return data == null ? "" : JSON.stringify(data).slice(0, 50);
}

function sortMergedEvents(events: MergedEvent[]): MergedEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function mergeAndSortEvents(
  algorithmEvents: AlgorithmEventDto[],
  internalEvents: InternalEventDto[]
): MergedEvent[] {
  return sortMergedEvents([
    ...algorithmEvents.map(algorithmEventToMerged),
    ...internalEvents.map(internalEventToMerged)
  ]);
}

export function internalEventToMerged(event: InternalEventDto): MergedEvent {
  return {
    timestamp: event.timestamp,
    type: "internal",
    name: event.name,
    number: event.number,
    details: formatInternalEventDetails(event.data),
    data: event.data
  };
}

export function algorithmEventToMerged(event: AlgorithmEventDto): MergedEvent {
  const direction = event.recipients?.length ? "Sent" : "Received";
  const details =
    direction === "Sent"
      ? `→ ${event.recipients?.join(", ") || ""}`
      : `← ${event.createdBy || ""}`;

  return {
    timestamp: event.timestamp,
    type: "algorithm",
    name: event.name,
    number: event.number,
    eventId: event.eventId,
    details
  };
}

export function appendMergedEvent(
  existingEvents: MergedEvent[],
  nextEvent: MergedEvent
): MergedEvent[] {
  const duplicate = existingEvents.some(
    (event) =>
      event.type === nextEvent.type &&
      event.number === nextEvent.number &&
      event.name === nextEvent.name
  );

  return duplicate
    ? existingEvents
    : sortMergedEvents([...existingEvents, nextEvent]);
}

export function isTerminalStatus(status: string): boolean {
  return ["FINISHED", "COMPLETED", "TERMINATED", "FAILED"].includes(
    status.toUpperCase()
  );
}

export function getLatestInternalEventValues(
  events: MergedEvent[]
): LatestInternalEventValue[] {
  const latestValues = events.reduce<Record<string, string>>((acc, event) => {
    if (
      event.type === "internal" &&
      event.data &&
      typeof event.data === "object" &&
      "value" in event.data
    ) {
      acc[event.name] = JSON.stringify(
        (event.data as { value: unknown }).value
      );
    }

    return acc;
  }, {});

  return Object.entries(latestValues).map(([name, value]) => ({ name, value }));
}

export function getEventCount(events: MergedEvent[]): {
  algorithm: number;
  internal: number;
} {
  return {
    algorithm: events.filter((event) => event.type === "algorithm").length,
    internal: events.filter((event) => event.type === "internal").length
  };
}

export function getInstanceInfoRows(
  instance: AlgorithmInstanceDto
): InstanceInfoRow[] {
  const status = instance.status.toUpperCase();

  return [
    { label: "Status", value: status, color: instanceStatusColor(status) },
    { label: "ID", value: instance.id },
    {
      label: "Created",
      value: formatDateWithSeconds(instance.createdDate)
    },
    {
      label: "Started",
      value: formatDateWithSeconds(instance.startedAt)
    },
    {
      label: "Finished",
      value: formatDateWithSeconds(instance.finishedAt)
    },
    {
      label: "Image",
      value: instance.algorithmDefinition?.image || "-"
    },
    {
      label: "Agreement",
      value: instance.projectAgreement
        ? `${instance.projectAgreement.title} (${instance.projectAgreement.status})`
        : "-"
    }
  ];
}
