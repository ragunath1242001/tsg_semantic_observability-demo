import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";

export async function CN_C_01_01(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0101")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0101");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId,
          permission: [
            new Permission({
              action: "odrl:read"
            })
          ]
        }),
        signal.datasetId,
        `${signal.connectorAddress}/negotiations`,
        signal.providerId
      );
    })
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.OFFERED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.accept(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.AGREED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.verify(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.FINALIZED,
      async ({ logger }) => {
        logger.debug("Received finalization");
      }
    )
    .execute();
}
export async function CN_C_01_02(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0102")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0102");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId,
          permission: [
            new Permission({
              action: "odrl:read"
            })
          ]
        }),
        signal.datasetId,
        `${signal.connectorAddress}/negotiations`,
        signal.providerId
      );
    })
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.OFFERED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.requestExisting(
          negotiation.offer!,
          negotiation.localId
        );
      }
    )
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received termination");
      }
    )
    .execute();
}

export async function CN_C_01_03(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0103")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0103");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId,
          permission: [
            new Permission({
              action: "odrl:read"
            })
          ]
        }),
        signal.datasetId,
        `${signal.connectorAddress}/negotiations`,
        signal.providerId
      );
    })
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.OFFERED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.terminate(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Terminated");
      }
    )
    .execute();
}
export async function CN_C_01_04(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0104")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0104");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId,
          permission: [
            new Permission({
              action: "odrl:read"
            })
          ]
        }),
        signal.datasetId,
        `${signal.connectorAddress}/negotiations`,
        signal.providerId
      );
    })
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.AGREED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.verify(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.FINALIZED,
      async ({ logger }) => {
        logger.debug("Finalized");
      }
    )
    .execute();
}
