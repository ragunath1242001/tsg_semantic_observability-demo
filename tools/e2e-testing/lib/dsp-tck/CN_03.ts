import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";

export async function CN_03_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0301")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.agree(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.VERIFIED,
      async ({ negotiation, negotiationService }) => {
        negotiationService.finalize(negotiation.localId);
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_03_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0302")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0302:456`,
            assigner: "did:web:localhost",
            target: "ACN0302",
            permission: [
              new Permission({
                action: "odrl:read"
              })
            ]
          }),
          negotiation.localId
        );
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_03_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0303")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0303:456`,
            assigner: "did:web:localhost",
            target: "ACN0303",
            permission: [
              new Permission({
                action: "odrl:read"
              })
            ]
          }),
          negotiation.localId
        );
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.ACCEPTED,
      async ({ logger }) => {
        logger.debug("Received accept");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}

export async function CN_03_04(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0304")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0304:456`,
            assigner: "did:web:localhost",
            target: "ACN0304",
            permission: [
              new Permission({
                action: "odrl:read"
              })
            ]
          }),
          negotiation.localId
        );
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Received new request");
      }
    )
    .onComplete(async ({ logger }) => {
      logger.debug("Wait for erroneous calls");
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .execute();
}
