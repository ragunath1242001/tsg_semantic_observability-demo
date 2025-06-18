import { TransferState } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";

export async function TP_C_03_01(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0301",
      "ATPC0301",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0301");
      await transferService.initiateTransferProcess(
        signal.agreementId,
        `${signal.connectorAddress}/transfers`,
        signal.providerId,
        signal.format
      );
    })
    .onEvent(
      "transfer",
      "consumer",
      TransferState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Transfer requested");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_C_03_02(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0302",
      "ATPC0302",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0302");
      await transferService.initiateTransferProcess(
        signal.agreementId,
        `${signal.connectorAddress}/transfers`,
        signal.providerId,
        signal.format
      );
    })
    .onEvent(
      "transfer",
      "consumer",
      TransferState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Transfer requested");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_C_03_03(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0303",
      "ATPC0303",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0303");
      await transferService.initiateTransferProcess(
        signal.agreementId,
        `${signal.connectorAddress}/transfers`,
        signal.providerId,
        signal.format
      );
    })
    .onEvent(
      "transfer",
      "consumer",
      TransferState.STARTED,
      async ({ logger }) => {
        logger.debug("Received transfer started");
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.SUSPENDED,
      async ({ logger }) => {
        logger.debug("Received transfer suspended");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_C_03_04(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0304",
      "ATPC0304",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0304");
      await transferService.initiateTransferProcess(
        signal.agreementId,
        `${signal.connectorAddress}/transfers`,
        signal.providerId,
        signal.format
      );
    })
    .onEvent(
      "transfer",
      "consumer",
      TransferState.STARTED,
      async ({ logger }) => {
        logger.debug("Received transfer started");
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_C_03_05(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0305",
      "ATPC0305",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0305");
      await transferService.initiateTransferProcess(
        signal.agreementId,
        `${signal.connectorAddress}/transfers`,
        signal.providerId,
        signal.format
      );
    })
    .onEvent(
      "transfer",
      "consumer",
      TransferState.STARTED,
      async ({ logger }) => {
        logger.debug("Received transfer started");
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_C_03_06(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0306",
      "ATPC0306",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0306");
      await transferService.initiateTransferProcess(
        signal.agreementId,
        `${signal.connectorAddress}/transfers`,
        signal.providerId,
        signal.format
      );
    })
    .onEvent(
      "transfer",
      "consumer",
      TransferState.STARTED,
      async ({ logger }) => {
        logger.debug("Received transfer started");
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    })
    .execute();
}
