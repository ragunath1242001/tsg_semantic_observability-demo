import { DspClientService } from "@apps/control-plane-api/dist/dsp/client/client.service.js";
import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  ContractAgreementVerificationMessage,
  ContractNegotiationState,
  ContractNegotiationTerminationMessage,
  ContractRequestMessage,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";

describe("Local - CN_03: Provider negative test scenarios", () => {
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;

  beforeAll(async () => {
    setupConfigFile("control-plane.config.yaml");
    const {
      AppModule,
      setupApp,
      DataPlaneService,
      CatalogService,
      NegotiationService,
      TransferService
    } = await import("@apps/control-plane-api");
    const { AppLogger } = await import("@tsg-dsp/common-api");
    const builder = Test.createTestingModule({
      imports: [AppModule]
    });
    if ("CI" in process.env === false) {
      builder.setLogger(new AppLogger());
    }
    app = await builder.compile().then((m) => m.createNestApplication());
    const config = setupApp(app);
    server = await app.listen(config.port, config.listen);

    await controlPlaneHealthy(config.port, app);

    pipelineExecutor = new PipelineExecutor(
      config.port,
      app.get(CatalogService),
      app.get(NegotiationService),
      app.get(TransferService),
      app.get(DataPlaneService)
    );
    await pipelineExecutor.init();
  });

  afterAll(async () => {
    try {
      pipelineExecutor.close();
      await server.close();
      await app.close();
    } catch (e) {
      console.error("Error cleaning up resources", e);
    }
  });

  beforeEach(async () => {
    await pipelineExecutor["negotiationService"][
      "negotiationProcessEventRepository"
    ].clear();
    await pipelineExecutor["negotiationService"][
      "negotiationDetailRepository"
    ].clear();
  });

  it("CN:03-01: Verify contract request, provider agreement, consumer verified, provider finalized, invalid consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0301")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0301");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/negotiations",
          "did:web:localhost%3A32490"
        );
      })
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
        "consumer",
        ContractNegotiationState.AGREED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.verify(negotiation.id);
        }
      )
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.VERIFIED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.finalize(negotiation.id);
        }
      )
      .onEvent(
        "negotiation",
        "consumer",
        ContractNegotiationState.FINALIZED,
        async ({ negotiation, negotiationService }) => {
          await expect(
            negotiationService.terminate(negotiation.id)
          ).rejects.toThrow("cannot transition from FINALIZED to TERMINATED");

          const dsp: DspClientService = negotiationService["dsp"];
          await expect(
            dsp.negotiationTermination(
              `${negotiation.remoteAddress}/termination`,
              new ContractNegotiationTerminationMessage({
                providerPid: negotiation.remoteId,
                consumerPid: negotiation.id,
                reason: []
              }),
              negotiation.remoteParty
            )
          ).rejects.toThrow("cannot transition from FINALIZED to TERMINATED");
        }
      )
      .execute();
  });
  it("CN:03-02: Verify contract request, offer received, invalid consumer verified", async () => {
    await pipelineExecutor
      .newPipeline("ACN0302")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0302");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/negotiations",
          "did:web:localhost%3A32490"
        );
      })
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.offer(
            new Offer({
              id: `CD123:ACN0302:456`,
              assigner: "did:web:localhost",
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
        "consumer",
        ContractNegotiationState.OFFERED,
        async ({ negotiation, negotiationService }) => {
          await expect(
            negotiationService.verify(negotiation.id)
          ).rejects.toThrow("cannot transition from OFFERED to VERIFIED");
          const dsp: DspClientService = negotiationService["dsp"];
          await expect(
            dsp.negotiationVerification(
              `${negotiation.remoteAddress}/agreement/verification`,
              new ContractAgreementVerificationMessage({
                providerPid: negotiation.remoteId,
                consumerPid: negotiation.id,
                hashedMessage: {
                  digest: "dummy-digest",
                  algorithm: "SHA-256"
                }
              }),
              negotiation.remoteParty
            )
          ).rejects.toThrow("cannot transition from OFFERED to VERIFIED");
        }
      )
      .execute();
  });
  it("CN:03-03: Verify contract request, offer received, consumer accepted, illegal consumer verified", async () => {
    await pipelineExecutor
      .newPipeline("ACN0303")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0303");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/negotiations",
          "did:web:localhost%3A32490"
        );
      })
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.offer(
            new Offer({
              id: `CD123:ACN0303:456`,
              assigner: "did:web:localhost",
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
        "consumer",
        ContractNegotiationState.OFFERED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.accept(negotiation.id);
        }
      )
      .onEvent(
        "negotiation",
        "consumer",
        ContractNegotiationState.ACCEPTED,
        async ({ negotiation, negotiationService }) => {
          await expect(
            negotiationService.verify(negotiation.id)
          ).rejects.toThrow("cannot transition from ACCEPTED to VERIFIED");
          const dsp: DspClientService = negotiationService["dsp"];
          await expect(
            dsp.negotiationVerification(
              `${negotiation.remoteAddress}/agreement/verification`,
              new ContractAgreementVerificationMessage({
                providerPid: negotiation.remoteId,
                consumerPid: negotiation.id,
                hashedMessage: {
                  digest: "dummy-digest",
                  algorithm: "SHA-256"
                }
              }),
              negotiation.remoteParty
            )
          ).rejects.toThrow("cannot transition from ACCEPTED to VERIFIED");
        }
      )
      .execute();
  });
  it("CN:03-04: Verify contract request, offer received, consumer counter-offer (x2), provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0304")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0304");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/negotiations",
          "did:web:localhost%3A32490"
        );
      })
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.offer(
            new Offer({
              id: `CD123:ACN0304:456`,
              assigner: "did:web:localhost",
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
        "consumer",
        ContractNegotiationState.OFFERED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.requestExisting(
            negotiation.offer!,
            negotiation.id
          );
        }
      )
      .onEvent(
        "negotiation",
        "consumer",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await expect(
            negotiationService.requestExisting(
              negotiation.offer!,
              negotiation.id
            )
          ).rejects.toThrow("cannot transition from REQUESTED to REQUESTED");
          const dsp: DspClientService = negotiationService["dsp"];
          await expect(
            dsp.requestExistingNegotiation(
              `${negotiation.remoteAddress}/request`,
              new ContractRequestMessage({
                providerPid: negotiation.remoteId,
                consumerPid: negotiation.id,
                offer: negotiation.offer!
              }),
              negotiation.remoteParty
            )
          ).rejects.toThrow("cannot transition from REQUESTED to REQUESTED");
        }
      )
      .execute();
  });
});
