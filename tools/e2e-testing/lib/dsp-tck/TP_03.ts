import { TransferState } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";

export async function TP_03_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0301",
      "ATP0301",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Received request");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_03_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0302",
      "ATP0302",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Received request");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_03_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0303",
      "ATP0303",
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
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_03_04(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0304",
      "ATP0304",
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
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_03_05(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0305",
      "ATP0305",
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
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function TP_03_06(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0306",
      "ATP0306",
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
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    })
    .execute();
}
