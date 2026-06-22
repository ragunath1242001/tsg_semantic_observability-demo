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
        ...event.context,
        participantPairPseudonym:
          event.context.participantPairPseudonym ??
          createParticipantPairPseudonym(
            event.context.participantPseudonym,
            event.context.remoteParticipantPseudonym
          ),
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
    ...event,
    context,
    artefacts: sanitizeArtefactReferences(event.artefacts),
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
    ...artefact,
    reference: pseudonymizeSemanticReference(artefact.reference) ?? "p_unknown"
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
