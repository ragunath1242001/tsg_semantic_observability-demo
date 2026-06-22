import { describe, expect, it } from "vitest";

import {
  SemanticArtefactType,
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus
} from "./enums.js";
import { sanitizeSemanticObservabilityEvent } from "./privacy.js";

describe("semantic observability privacy", () => {
  it("pseudonymizes linkable ids and artefact references by default", () => {
    const sanitized = sanitizeSemanticObservabilityEvent({
      eventId: "event-1",
      timestamp: "2026-06-03T12:00:00.000Z",
      component: SemanticObservabilityComponent.CONTROL_PLANE,
      eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
      dimensions: [SemanticObservabilityDimension.STABILITY],
      status: SemanticObservabilityStatus.SUCCESS,
      context: {
        negotiationId: "negotiation-123",
        agreementId: "agreement-123",
        transferId: "transfer-123",
        correlationId: "correlation-123",
        traceId: "trace-123"
      },
      artefacts: [
        {
          type: SemanticArtefactType.SEMANTIC_MODEL,
          reference:
            "https://internal.example.test/models/customer-sensitive-model",
          version: "1.0.0"
        }
      ]
    });

    expect(sanitized.context?.negotiationId).toMatch(/^p_/);
    expect(sanitized.context?.agreementId).toMatch(/^p_/);
    expect(sanitized.context?.transferId).toMatch(/^p_/);
    expect(sanitized.context?.correlationId).toMatch(/^p_/);
    expect(sanitized.context?.traceId).toMatch(/^p_/);
    expect(sanitized.artefacts?.[0].reference).toMatch(/^p_/);
    expect(sanitized.artefacts?.[0].reference).not.toContain("customer");
  });

  it("redacts sensitive primitive attributes", () => {
    const sanitized = sanitizeSemanticObservabilityEvent({
      eventId: "event-1",
      timestamp: "2026-06-03T12:00:00.000Z",
      component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
      eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
      dimensions: [SemanticObservabilityDimension.FRICTION],
      status: SemanticObservabilityStatus.FAILURE,
      attributes: {
        method: "GET",
        errorMessage:
          "failed while processing customer email alice@example.test",
        authorizationHeader: "Bearer secret"
      }
    });

    expect(sanitized.attributes).toEqual({
      method: "GET",
      errorMessage: "[redacted]",
      authorizationHeader: "[redacted]"
    });
  });

  it("derives a participant pair pseudonym when both participants are present", () => {
    const sanitized = sanitizeSemanticObservabilityEvent({
      eventId: "event-1",
      timestamp: "2026-06-03T12:00:00.000Z",
      component: SemanticObservabilityComponent.CONTROL_PLANE,
      eventType: SemanticObservabilityEventType.NEGOTIATION_STATE_CHANGED,
      dimensions: [SemanticObservabilityDimension.STABILITY],
      status: SemanticObservabilityStatus.SUCCESS,
      context: {
        participantPseudonym: "p_local",
        remoteParticipantPseudonym: "p_remote"
      }
    });

    expect(sanitized.context?.participantPairPseudonym).toMatch(/^p_/);
  });

  it("does not allow privacy sanitization to be disabled", () => {
    const sanitized = (
      sanitizeSemanticObservabilityEvent as unknown as (
        event: Parameters<typeof sanitizeSemanticObservabilityEvent>[0],
        options: Record<string, unknown>
      ) => ReturnType<typeof sanitizeSemanticObservabilityEvent>
    )(
      {
        eventId: "event-1",
        timestamp: "2026-06-03T12:00:00.000Z",
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
        dimensions: [SemanticObservabilityDimension.FRICTION],
        status: SemanticObservabilityStatus.FAILURE,
        artefacts: [
          {
            type: SemanticArtefactType.SEMANTIC_MODEL,
            reference: "https://internal.example.test/models/customer-profile"
          }
        ],
        attributes: {
          errorMessage: "customer email alice@example.test"
        }
      },
      {
        enabled: false,
        redactErrorMessages: false,
        storeRawArtefactReferences: true
      }
    );

    expect(sanitized.artefacts?.[0].reference).toMatch(/^p_/);
    expect(sanitized.artefacts?.[0].reference).not.toContain("customer");
    expect(sanitized.attributes?.errorMessage).toBe("[redacted]");
  });
});
