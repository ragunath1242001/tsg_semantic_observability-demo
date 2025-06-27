import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";

export async function CN_01_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0101")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0101:456`,
            assigner: "did:web:localhost",
            target: "ACN0101",
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
      ContractNegotiationState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Received termination");
      }
    )
    .execute();
}

export async function CN_01_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0102")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0102:456`,
            assigner: "did:web:localhost",
            target: "ACN0102",
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
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received counter-offer");
        await negotiationService.terminate(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Finalized");
      }
    )
    .execute();
}

export async function CN_01_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0103")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0103:456`,
            assigner: "did:web:localhost",
            target: "ACN0103",
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
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received accept");
        await negotiationService.agree(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.VERIFIED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received verified");
        await negotiationService.finalize(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.FINALIZED,
      async ({ logger }) => {
        logger.debug("Finalized");
      }
    )
    .execute();
}

export async function CN_01_04(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0104")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received request");
        await negotiationService.agree(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.VERIFIED,
      async ({ negotiation, negotiationService, logger }) => {
        logger.debug("Received verified");
        await negotiationService.finalize(negotiation.localId);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.FINALIZED,
      async ({ logger }) => {
        logger.debug("Finalized");
      }
    )
    .execute();
}
