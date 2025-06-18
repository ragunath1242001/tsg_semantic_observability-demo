import { ContractNegotiationState, Offer } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";

export async function CN_C_02_01(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0201")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0201");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId
        }),
        signal.datasetId,
        `${signal.connectorAddress}/negotiations`,
        signal.providerId
      );
    })
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

export async function CN_C_02_02(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0202")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0202");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId
        }),
        signal.datasetId,
        `${signal.connectorAddress}/negotiations`,
        signal.providerId
      );
    })
    .onEvent(
      "negotiation",
      "consumer",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        setTimeout(() => {
          negotiationService.terminate(negotiation.localId);
        }, 100);
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

export async function CN_C_02_03(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0203")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0203");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId
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
        negotiationService.terminate(negotiation.localId);
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

export async function CN_C_02_04(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0204")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0204");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId
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

export async function CN_C_02_05(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0205")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0205");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId
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
      ContractNegotiationState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Terminated");
      }
    )
    .execute();
}

export async function CN_C_02_06(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline("ACNC0206")
    .onSetup(async ({ negotiationService }) => {
      const signal =
        await signalController.waitForNegotiationSignal("ACNC0206");
      await negotiationService.requestNew(
        new Offer({
          id: signal.offerId,
          assigner: signal.providerId
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
        negotiationService.verify(negotiation.localId);
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
