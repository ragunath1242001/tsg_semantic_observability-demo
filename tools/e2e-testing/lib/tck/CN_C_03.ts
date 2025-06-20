import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";

export async function CN_C_03_01(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0301")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0301");
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
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_C_03_02(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0302")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0302");
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
      async ({ logger }) => {
        logger.debug("Received offer");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_C_03_03(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0303")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0303");
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
      async ({ logger }) => {
        logger.debug("Received offer");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_C_03_04(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0304")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0304");
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
        negotiationService.accept(negotiation.localId);
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_C_03_05(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0305")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0305");
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
        negotiationService.accept(negotiation.localId);
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_C_03_06(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0306")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0306");
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
        negotiationService.accept(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.AGREED,
      async ({ logger }) => {
        logger.debug("Received agreement");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    })
    .execute();
}
