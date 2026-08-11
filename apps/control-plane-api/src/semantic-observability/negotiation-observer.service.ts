import { Injectable, Logger } from "@nestjs/common";
import { ContractNegotiationState, NegotiationRole } from "@tsg-dsp/common-dsp";
import {
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus,
  pseudonymizeIdentifier,
  sanitizeAttributes
} from "@tsg-dsp/semantic-observability";

import { SemanticObservabilityService } from "./semantic-observability.service.js";

export interface NegotiationObservation {
  id: string;
  remoteParty?: string;
  role: NegotiationRole;
  state: ContractNegotiationState;
  dataSet?: string;
  agreementId?: string;
}

@Injectable()
export class NegotiationObserverService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  async recordNegotiationStateChanged(
    negotiation: NegotiationObservation,
    direction: "local" | "remote"
  ) {
    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.NEGOTIATION_STATE_CHANGED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          ...(isFrictionState(negotiation.state)
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status: mapNegotiationStateToStatus(negotiation.state),
        context: {
          negotiationId: negotiation.id,
          agreementId: negotiation.agreementId,
          correlationId: negotiation.agreementId ?? negotiation.id,
          datasetPseudonym: pseudonymizeIdentifier(negotiation.dataSet),
          remoteParticipantPseudonym: pseudonymizeIdentifier(
            negotiation.remoteParty
          )
        },
        failureCategory: isFrictionState(negotiation.state)
          ? "negotiation_terminated"
          : undefined,
        attributes: sanitizeAttributes({
          direction,
          role: negotiation.role,
          state: negotiation.state
        })
      });
    });
  }

  private async tryRecord(record: () => Promise<void>) {
    try {
      await record();
    } catch (error) {
      this.logger.warn(
        `Could not record semantic observability event: ${error}`
      );
    }
  }
}

function mapNegotiationStateToStatus(
  state: ContractNegotiationState
): SemanticObservabilityStatus {
  if (state === ContractNegotiationState.FINALIZED) {
    return SemanticObservabilityStatus.SUCCESS;
  }
  if (isFrictionState(state)) {
    return SemanticObservabilityStatus.FAILURE;
  }
  return SemanticObservabilityStatus.INFO;
}

function isFrictionState(state: ContractNegotiationState): boolean {
  return state === ContractNegotiationState.TERMINATED;
}
