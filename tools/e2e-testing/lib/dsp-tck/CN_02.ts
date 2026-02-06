import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";

export async function CN_02_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0201")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.terminate(negotiation.id);
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
export async function CN_02_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0202")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ logger }) => {
        logger.debug("Received request");
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
export async function CN_02_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0203")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.agree(negotiation.id);
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
export async function CN_02_04(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0204")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0204:456`,
            assigner: "did:web:localhost",
            target: "ACN0204",
            permission: [
              new Permission({
                action: "odrl:read"
              })
            ]
          }),
          negotiation.id
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
export async function CN_02_05(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0205")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0205:456`,
            assigner: "did:web:localhost",
            target: "ACN0205",
            permission: [
              new Permission({
                action: "odrl:read"
              })
            ]
          }),
          negotiation.id
        );
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.OFFERED,
      async ({ negotiation, negotiationService }) => {
        setTimeout(() => {
          negotiationService.terminate(negotiation.id);
        }, 100);
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
export async function CN_02_06(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0206")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.offer(
          new Offer({
            id: `CD123:ACN0206:456`,
            assigner: "did:web:localhost",
            target: "ACN0206",
            permission: [
              new Permission({
                action: "odrl:read"
              })
            ]
          }),
          negotiation.id
        );
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.ACCEPTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.terminate(negotiation.id);
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
export async function CN_02_07(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor
    .newPipeline("ACN0207")
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.REQUESTED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.agree(negotiation.id);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.VERIFIED,
      async ({ negotiation, negotiationService }) => {
        await negotiationService.terminate(negotiation.id);
      }
    )
    .onEvent(
      "negotiation",
      "provider",
      ContractNegotiationState.TERMINATED,
      async ({ logger }) => {
        logger.debug("Terminated");
      }
    )
    .execute();
}
