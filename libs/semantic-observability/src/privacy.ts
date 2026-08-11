import {
  SemanticArtefactReference,
  SemanticObservabilityEvent
} from "./events.js";
import {
  pseudonymizeIdentifier,
  pseudonymizeSemanticReference,
  sanitizeAttributes
} from "./sanitizer.js";

export function sanitizeSemanticObservabilityEvent(
  event: SemanticObservabilityEvent
): SemanticObservabilityEvent {
  const context = event.context
    ? {
        participantPseudonym: event.context.participantPseudonym,
        remoteParticipantPseudonym: event.context.remoteParticipantPseudonym,
        participantPairPseudonym:
          event.context.participantPairPseudonym ??
          createParticipantPairPseudonym(
            event.context.participantPseudonym,
            event.context.remoteParticipantPseudonym
          ),
        datasetPseudonym: event.context.datasetPseudonym,
        datasetCategory: event.context.datasetCategory,
        negotiationId: pseudonymizeIdentifier(
          event.context.negotiationId,
          "negotiation"
        ),
        agreementId: pseudonymizeIdentifier(
          event.context.agreementId,
          "agreement"
        ),
        transferId: pseudonymizeIdentifier(
          event.context.transferId,
          "transfer"
        ),
        correlationId: pseudonymizeIdentifier(
          event.context.correlationId,
          "correlation"
        ),
        traceId: pseudonymizeIdentifier(event.context.traceId, "trace")
      }
    : undefined;

  return {
    eventId: event.eventId,
    timestamp: event.timestamp,
    component: event.component,
    eventType: event.eventType,
    dimensions: event.dimensions,
    status: event.status,
    context,
    artefacts: sanitizeArtefactReferences(event.artefacts),
    failureCategory: event.failureCategory,
    durationMs: event.durationMs,
    metadataCompletenessScore: event.metadataCompletenessScore,
    validationErrorCount: event.validationErrorCount,
    attributes: event.attributes
      ? sanitizeAttributes(event.attributes, undefined, true)
      : undefined
  };
}

function sanitizeArtefactReferences(
  artefacts: SemanticArtefactReference[] | undefined
): SemanticArtefactReference[] | undefined {
  if (!artefacts) {
    return undefined;
  }

  return artefacts.map((artefact) => ({
    type: artefact.type,
    reference: pseudonymizeSemanticReference(artefact.reference) ?? "p_unknown",
    version: artefact.version
  }));
}

function createParticipantPairPseudonym(
  participantPseudonym: string | undefined,
  remoteParticipantPseudonym: string | undefined
): string | undefined {
  if (!participantPseudonym || !remoteParticipantPseudonym) {
    return undefined;
  }

  return pseudonymizeIdentifier(
    [participantPseudonym, remoteParticipantPseudonym].sort().join("|"),
    "participant-pair"
  );
}
