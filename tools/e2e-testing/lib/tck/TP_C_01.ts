import { TransferState } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "./tck.test.js";

export async function TP_C_01_01(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0101",
      "ATPC0101",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0101");
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
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}

export async function TP_C_01_02(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0102",
      "ATPC0102",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0102");
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
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Received transfer completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}

export async function TP_C_01_03(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0103",
      "ATPC0103",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0103");
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
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}

export async function TP_C_01_04(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0104",
      "ATPC0104",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0104");
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
    .onEvent(
      "transfer",
      "consumer",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Received transfer completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}

export async function TP_C_01_05(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0105",
      "ATPC0105",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0105");
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
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
