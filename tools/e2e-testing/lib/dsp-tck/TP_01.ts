import { TransferState } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";

export async function TP_01_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0101",
      "ATP0101",
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
      TransferState.STARTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.terminate(
            transfer.localId,
            "500",
            "Termination test",
            true
          );
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Terminated");
      }
    )
    .execute();
}
export async function TP_01_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0102",
      "ATP0102",
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
      TransferState.STARTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.complete(transfer.localId, true);
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Completed");
      }
    )
    .execute();
}

export async function TP_01_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0103",
      "ATP0103",
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
      TransferState.STARTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.suspend(transfer.localId, "Test suspension", true);
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.SUSPENDED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.terminate(
            transfer.localId,
            "500",
            "Test termination",
            true
          );
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Terminated");
      }
    )
    .execute();
}

export async function TP_01_04(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0104",
      "ATP0104",
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
      TransferState.STARTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.suspend(transfer.localId, "Test suspension", true);
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.SUSPENDED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.start(
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
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.STARTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.complete(transfer.localId, true);
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_01_05(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline(
      "TP0105",
      "ATP0105",
      "did:web:localhost%3A32490",
      "TCK_PARTICIPANT"
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.REQUESTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.terminate(
            transfer.localId,
            "500",
            "Test termination",
            true
          );
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "provider",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 500));
    })
    .execute();
}
