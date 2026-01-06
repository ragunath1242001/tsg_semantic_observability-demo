import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { BridgeAlgorithmInstanceMetadataDto } from "@tsg-dsp/analytics-data-plane-dtos";
import type {
  BridgePushAlgorithmEventDataDto,
  BridgePushAlgorithmEventDto
} from "@tsg-dsp/analytics-data-plane-dtos";

export const INTERNAL_EVENTS = {
  ALGORITHM_INSTANCES_CREATED: "algorithm-instances.created",
  ALGORITHM_INSTANCES_UPDATED: "algorithm-instances.updated",
  ALGORITHM_INSTANCES_START_REQUESTED: "algorithm-instances.start-requested",
  ALGORITHM_EVENTS_RECEIVED: "algorithm-events.received",
  ALGORITHM_EVENT_DATA_RECEIVED: "algorithm-events.data-received",
  JOB_SPAWN: "job.spawn"
} as const;

export type InternalEventMap = {
  [INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED]: {
    algorithmInstance: BridgeAlgorithmInstanceMetadataDto;
  };
  [INTERNAL_EVENTS.ALGORITHM_INSTANCES_UPDATED]: {
    algorithmInstance: BridgeAlgorithmInstanceMetadataDto;
  };
  [INTERNAL_EVENTS.ALGORITHM_INSTANCES_START_REQUESTED]: {
    algorithmInstanceId: string;
    requestedAt?: Date;
  };
  [INTERNAL_EVENTS.ALGORITHM_EVENTS_RECEIVED]: BridgePushAlgorithmEventDto;
  [INTERNAL_EVENTS.ALGORITHM_EVENT_DATA_RECEIVED]: BridgePushAlgorithmEventDataDto;
  [INTERNAL_EVENTS.JOB_SPAWN]: {
    algorithmInstanceId: string;
    participantId: string;
    imageName: string;
    command?: string;
    datasetId?: string;
  };
};

export type InternalEventName = keyof InternalEventMap;

export function emitInternalEvent<E extends InternalEventName>(
  emitter: Pick<EventEmitter2, "emit">,
  event: E,
  payload: InternalEventMap[E]
): boolean {
  return emitter.emit(event, payload);
}
