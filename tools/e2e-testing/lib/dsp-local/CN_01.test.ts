import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import { expectedNegotiationState } from "../types.js";

describe("Local - CN_01: Contract request scenarios", () => {
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

  it("CN:01-01: Verify contract request, offer received, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0101")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0101");
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
              id: `CD123:ACN0101:456`,
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
          await negotiationService.terminate(negotiation.id);
        }
      )
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.TERMINATED,
        async ({ logger }) => {
          logger.log("Negotiation terminated by consumer, provider notified");
        }
      )
      .onComplete(expectedNegotiationState(ContractNegotiationState.TERMINATED))
      .execute();
  }, 5000);

  it("CN:01-02: Verify contract request, offer received, consumer counter-offer, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0102")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0102");
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
              id: `CD123:ACN0102:456`,
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
        "provider",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.id);
        }
      )
      .onEvent(
        "negotiation",
        "consumer",
        ContractNegotiationState.TERMINATED,
        async ({ logger }) => {
          logger.log("Negotiation terminated by provider, consumer notified");
        }
      )
      .onComplete(expectedNegotiationState(ContractNegotiationState.TERMINATED))
      .execute();
  }, 5000);
  it("CN:01-03: Verify contract request, offer received, consumer accepted, provider agreement, consumer verified, provider finalized", async () => {
    await pipelineExecutor
      .newPipeline("ACN0103")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0103");
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
              id: `CD123:ACN0103:456`,
              assigner: "did:web:localhost",
              target: "ACN0103",
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
        "provider",
        ContractNegotiationState.ACCEPTED,
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
        async ({ logger }) => {
          logger.log("Negotiation finalized by provider, consumer notified");
        }
      )
      .onComplete(expectedNegotiationState(ContractNegotiationState.FINALIZED))
      .execute();
  }, 5000);

  it("CN:01-04: Verify contract request, provider agreement, consumer verified, provider finalized", async () => {
    await pipelineExecutor
      .newPipeline("ACN0104")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0104");
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
        async ({ logger }) => {
          logger.log("Negotiation finalized by provider, consumer notified");
        }
      )
      .onComplete(expectedNegotiationState(ContractNegotiationState.FINALIZED))
      .execute();
  }, 5000);
});
