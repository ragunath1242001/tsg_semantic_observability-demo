import { Injectable, Logger } from "@nestjs/common";
import { TransferState } from "@tsg-dsp/common-dsp";
import {
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus,
  pseudonymizeIdentifier,
  sanitizeAttributes
} from "@tsg-dsp/semantic-observability";

import { SemanticObservabilityService } from "./semantic-observability.service.js";

@Injectable()
export class TransferExecutionObserverService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  async recordTransferStateChanged(params: {
    transferId: string;
    agreementId?: string;
    datasetId: string;
    remoteParty: string;
    state: TransferState;
    role: "provider" | "consumer";
  }) {
    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          ...(isFrictionState(params.state)
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status: mapTransferStateToStatus(params.state),
        context: {
          transferId: params.transferId,
          agreementId: params.agreementId,
          correlationId: params.agreementId ?? params.transferId,
          datasetPseudonym: pseudonymizeIdentifier(params.datasetId),
          remoteParticipantPseudonym: pseudonymizeIdentifier(params.remoteParty)
        },
        attributes: sanitizeAttributes({
          state: params.state,
          role: params.role
        })
      });
    });
  }

  async recordDataPlaneAccess(params: {
    transferId: string;
    agreementId?: string;
    datasetId: string;
    remoteParty: string;
    direction: "ingress" | "egress";
    method: string;
    status: number;
  }) {
    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          ...(params.status >= 400
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status:
          params.status >= 400
            ? SemanticObservabilityStatus.FAILURE
            : SemanticObservabilityStatus.SUCCESS,
        context: {
          transferId: params.transferId,
          agreementId: params.agreementId,
          correlationId: params.agreementId ?? params.transferId,
          datasetPseudonym: pseudonymizeIdentifier(params.datasetId),
          remoteParticipantPseudonym: pseudonymizeIdentifier(params.remoteParty)
        },
        failureCategory:
          params.status >= 500
            ? "backend_or_proxy_error"
            : params.status >= 400
              ? "client_or_authorization_error"
              : undefined,
        attributes: sanitizeAttributes({
          direction: params.direction,
          method: params.method,
          httpStatus: params.status
        })
      });
    });
  }

  async recordDataPlaneAccessFailure(params: {
    transferId: string;
    agreementId?: string;
    datasetId: string;
    remoteParty: string;
    direction: "ingress" | "egress";
    method: string;
    error: unknown;
  }) {
    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.DATA_PLANE_ACCESS_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          SemanticObservabilityDimension.FRICTION
        ],
        status: SemanticObservabilityStatus.FAILURE,
        context: {
          transferId: params.transferId,
          agreementId: params.agreementId,
          correlationId: params.agreementId ?? params.transferId,
          datasetPseudonym: pseudonymizeIdentifier(params.datasetId),
          remoteParticipantPseudonym: pseudonymizeIdentifier(params.remoteParty)
        },
        failureCategory: "proxy_execution_error",
        attributes: sanitizeAttributes({
          direction: params.direction,
          method: params.method,
          errorMessage:
            params.error instanceof Error
              ? params.error.message
              : String(params.error)
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

function mapTransferStateToStatus(
  state: TransferState
): SemanticObservabilityStatus {
  if (state === TransferState.COMPLETED || state === TransferState.STARTED) {
    return SemanticObservabilityStatus.SUCCESS;
  }
  if (state === TransferState.TERMINATED) {
    return SemanticObservabilityStatus.FAILURE;
  }
  if (state === TransferState.SUSPENDED) {
    return SemanticObservabilityStatus.WARNING;
  }
  return SemanticObservabilityStatus.INFO;
}

function isFrictionState(state: TransferState): boolean {
  return (
    state === TransferState.SUSPENDED || state === TransferState.TERMINATED
  );
}
