import {
  CatalogService,
  DataPlaneService,
  NegotiationService,
  setupApp,
  TransferService
} from "@apps/control-plane-api";
import { AppModule } from "@apps/control-plane-api";
import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppLogger } from "@tsg-dsp/common-api";
import {
  ContractNegotiationState,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import { expectedNegotiationState } from "../types.js";

describe("Local - CN_02: Provider test scenarios", () => {
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;

  beforeAll(async () => {
    setupConfigFile();
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

  it("CN:02-01: Verify contract request, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0201")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0201");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
          "did:web:localhost%3A32490"
        );
      })
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
  it("CN:02-02: Verify contract request, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0202")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0202");
        await negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
          "did:web:localhost%3A32490"
        );
      })
      .onEvent(
        "negotiation",
        "consumer",
        ContractNegotiationState.REQUESTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
  it("CN:02-03: Verify contract request, provider agreement, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0203")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0203");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
          "did:web:localhost%3A32490"
        );
      })
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
        "consumer",
        ContractNegotiationState.AGREED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
  it("CN:02-04: Verify contract request, offer received, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0204")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0204");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
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
              id: `CD123:ACN0204:456`,
              assigner: "did:web:localhost",
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
        "consumer",
        ContractNegotiationState.OFFERED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
  it("CN:02-05: Verify contract request, offer received, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0205")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0205");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
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
              id: `CD123:ACN0205:456`,
              assigner: "did:web:localhost",
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
        ContractNegotiationState.OFFERED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
  it("CN:02-06: Verify contract request, offer received, consumer accepted, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0206")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0206");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
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
              id: `CD123:ACN0206:456`,
              assigner: "did:web:localhost",
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
        "consumer",
        ContractNegotiationState.OFFERED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.accept(negotiation.localId);
        }
      )
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.ACCEPTED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
  it("CN:02-07: Verify contract request, provider agreement, consumer verified, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ACN0207")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("ACN0207");
        negotiationService.requestNew(
          dataset.hasPolicy![0] as Offer,
          dataset.id,
          "http://localhost:32490/api/negotiations",
          "did:web:localhost%3A32490"
        );
      })
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
        "consumer",
        ContractNegotiationState.AGREED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.verify(negotiation.localId);
        }
      )
      .onEvent(
        "negotiation",
        "provider",
        ContractNegotiationState.VERIFIED,
        async ({ negotiation, negotiationService }) => {
          await negotiationService.terminate(negotiation.localId);
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
  });
});
