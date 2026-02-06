import { TransferState } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";

export async function TP_C_02_01(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0201",
      "ATPC0201",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0201");
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
      async ({ transfer, transferService }) => {
        await transferService.terminate(
          transfer.id,
          "500",
          "Termination test",
          true
        );
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_C_02_02(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0202",
      "ATPC0202",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0202");
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
      async ({ transfer, transferService }) => {
        await transferService.complete(transfer.id, true);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Transfer completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_C_02_03(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0203",
      "ATPC0203",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0203");
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
      async ({ transfer, transferService }) => {
        await transferService.suspend(transfer.id, "Test suspension", true);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.SUSPENDED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.terminate(
            transfer.id,
            "500",
            "Test termination",
            true
          );
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_C_02_04(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0204",
      "ATPC0204",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0204");
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
      async ({ transfer, transferService }) => {
        await transferService.suspend(transfer.id, "Test suspension", true);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.SUSPENDED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.start(transfer.id, undefined, true);
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.STARTED,
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.complete(transfer.id, true);
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.COMPLETED,
      async ({ logger }) => {
        logger.debug("Transfer completed");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
export async function TP_C_02_05(
  pipelineExecutor: PipelineExecutor,
  signalController: SignalController
) {
  return await pipelineExecutor
    .newPipeline(
      "TPC0205",
      "ATPC0205",
      "TCK_PARTICIPANT",
      "did:web:localhost%3A32490"
    )
    .onSetup(async ({ transferService }) => {
      const signal = await signalController.waitForTransferSignal("ATPC0205");
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
      async ({ transfer, transferService }) => {
        setTimeout(() => {
          transferService.terminate(
            transfer.id,
            "500",
            "Test suspension",
            true
          );
        }, 100);
      }
    )
    .onEvent(
      "transfer",
      "consumer",
      TransferState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Transfer terminated");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Completed, waiting for callbacks");
      await new Promise((resolve) => setTimeout(resolve, 250));
    })
    .execute();
}
