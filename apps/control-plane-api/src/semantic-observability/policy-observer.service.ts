import { Injectable, Logger } from "@nestjs/common";
import {
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus,
  pseudonymizeIdentifier,
  sanitizeAttributes
} from "@tsg-dsp/semantic-observability";

import {
  EvaluationContext,
  EvaluationDecision
} from "../policy/evaluation.dto.js";
import { SemanticObservabilityService } from "./semantic-observability.service.js";

@Injectable()
export class PolicyObserverService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  async recordPolicyEvaluationResult(
    context: EvaluationContext,
    decision: EvaluationDecision
  ) {
    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.POLICY_EVALUATION_RESULT,
        dimensions: [
          SemanticObservabilityDimension.FRICTION,
          SemanticObservabilityDimension.STABILITY
        ],
        status:
          decision.decision === "ALLOW"
            ? SemanticObservabilityStatus.SUCCESS
            : SemanticObservabilityStatus.FAILURE,
        context: {
          transferId: context.transferId,
          agreementId: context.policy.agreement["@id"],
          correlationId: context.policy.agreement["@id"],
          datasetPseudonym: pseudonymizeIdentifier(context.target),
          participantPseudonym: pseudonymizeIdentifier(
            context.localParticipant
          ),
          remoteParticipantPseudonym: pseudonymizeIdentifier(
            context.remoteParticipant
          )
        },
        failureCategory:
          decision.decision === "DENY" ? "policy_evaluation_denied" : undefined,
        attributes: sanitizeAttributes({
          decision: decision.decision,
          reason: decision.reason,
          role: context.role,
          scope: context.scope,
          action: context.action
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
