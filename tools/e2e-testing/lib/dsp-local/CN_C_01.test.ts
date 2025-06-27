import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ContractNegotiationState, Offer } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import { expectedNegotiationState } from "../types.js";

describe("Local - CN_C_01: Contract request scenarios", () => {
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

  it("CN_C:01-01: Verify contract request, offer received, consumer accepted, provider agreed, consumer verified, provider finalized", async () => {
    await pipelineExecutor
      .newPipeline("C0101")
      .onSetup(async ({ catalogService, negotiationService }) => {
        const dataset = await catalogService.getDataset("C0101");
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
          await negotiationService.finalize(negotiation.localId);
        }
      )
      .onComplete(expectedNegotiationState(ContractNegotiationState.FINALIZED))
      .execute();
  }, 5000);
});
