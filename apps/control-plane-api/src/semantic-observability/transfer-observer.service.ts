import { Injectable, Logger } from "@nestjs/common";
import { TransferRole, TransferState } from "@tsg-dsp/common-dsp";
import {
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus,
  pseudonymizeIdentifier,
  sanitizeAttributes
} from "@tsg-dsp/semantic-observability";

import { SemanticObservabilityService } from "./semantic-observability.service.js";

export interface TransferObservation {
  id: string;
  remoteParty?: string;
  role: TransferRole;
  state: TransferState;
  agreementId?: string;
  format?: string;
}

@Injectable()
export class TransferObserverService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  async recordTransferStateChanged(
    transfer: TransferObservation,
    direction: "local" | "remote"
  ) {
    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType: SemanticObservabilityEventType.TRANSFER_STATE_CHANGED,
        dimensions: [
          SemanticObservabilityDimension.STABILITY,
          ...(isFrictionState(transfer.state)
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status: mapTransferStateToStatus(transfer.state),
        context: {
          transferId: transfer.id,
          agreementId: transfer.agreementId,
          correlationId: transfer.agreementId ?? transfer.id,
          remoteParticipantPseudonym: pseudonymizeIdentifier(
            transfer.remoteParty
          )
        },
        failureCategory: isFrictionState(transfer.state)
          ? "transfer_interrupted"
          : undefined,
        attributes: sanitizeAttributes({
          direction,
          role: transfer.role,
          state: transfer.state,
          format: transfer.format
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
