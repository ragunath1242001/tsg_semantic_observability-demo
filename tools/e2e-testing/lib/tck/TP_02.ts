import { TransferState } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";

export async function TP_02_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0201",
      "ATP0201",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ transfer, transferService }) => {
        await transferService.start(
          transfer.localId,
          {
            endpoint: "http://dataplane.test",
            properties: [
              {
                name: "token",
                value: "TEST_TOKEN"
              }
            ]
          },
          true
        );
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}

export async function TP_02_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0202",
      "ATP0202",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ transfer, transferService }) => {
        await transferService.start(
          transfer.localId,
          {
            endpoint: "http://dataplane.test",
            properties: [
              {
                name: "token",
                value: "TEST_TOKEN"
              }
            ]
          },
          true
        );
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Received completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_02_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0203",
      "ATP0203",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ transfer, transferService }) => {
        await transferService.start(
          transfer.localId,
          {
            endpoint: "http://dataplane.test",
            properties: [
              {
                name: "token",
                value: "TEST_TOKEN"
              }
            ]
          },
          true
        );
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.SUSPENDED,
      async ({ logger }) => {
        logger.debug("Received suspended");
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_02_04(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0204",
      "ATP0204",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ transfer, transferService }) => {
        await transferService.start(
          transfer.localId,
          {
            endpoint: "http://dataplane.test",
            properties: [
              {
                name: "token",
                value: "TEST_TOKEN"
              }
            ]
          },
          true
        );
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.SUSPENDED,
      async ({ logger }) => {
        logger.debug("Received suspended");
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.STARTED,
      async ({ logger }) => {
        logger.debug("Received started");
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Received completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}

export async function TP_02_05(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0205",
      "ATP0205",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Received requested");
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
