import {
  SemanticArtefactType,
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus
} from "./enums.js";

export interface SemanticArtefactReference {
  type: SemanticArtefactType;
  reference: string;
  version?: string;
}

export interface SemanticObservabilityContext {
  participantPseudonym?: string;
  remoteParticipantPseudonym?: string;
  participantPairPseudonym?: string;
  datasetPseudonym?: string;
  datasetCategory?: string;
  negotiationId?: string;
  agreementId?: string;
  transferId?: string;
  correlationId?: string;
  traceId?: string;
}

export interface SemanticObservabilityEvent {
  eventId: string;
  timestamp: string;
  component: SemanticObservabilityComponent;
  eventType: SemanticObservabilityEventType;
  dimensions: SemanticObservabilityDimension[];
  status: SemanticObservabilityStatus;
  context?: SemanticObservabilityContext;
  artefacts?: SemanticArtefactReference[];
  failureCategory?: string;
  durationMs?: number;
  metadataCompletenessScore?: number;
  validationErrorCount?: number;
  attributes?: Record<string, string | number | boolean | null>;
}

export type CreateSemanticObservabilityEvent = Omit<
  SemanticObservabilityEvent,
  "eventId" | "timestamp"
> &
  Partial<Pick<SemanticObservabilityEvent, "eventId" | "timestamp">>;

export function createSemanticObservabilityEvent(
  event: CreateSemanticObservabilityEvent
): SemanticObservabilityEvent {
  return {
    ...event,
    eventId: event.eventId ?? createEventId(),
    timestamp: event.timestamp ?? new Date().toISOString()
  };
}

function createEventId(): string {
  return `soe_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
