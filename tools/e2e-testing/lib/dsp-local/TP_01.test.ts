import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TransferState } from "@tsg-dsp/common-dsp";
import { SetupServer, setupServer } from "msw/node";

import { setupDataPlaneMock } from "../dataPlane.mock.js";
import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import { expectedTransferState } from "../types.js";

describe("Local - TP_01: Transfer request provider scenarios", () => {
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;
  let mockServer: SetupServer;

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

    const consumerDataplaneMock = setupDataPlaneMock(
      "consumer",
      "CD-1",
      "HttpData-PULL"
    );
    const providerDataplaneMock = setupDataPlaneMock(
      "provider",
      "PD-1",
      "HttpData-PULL"
    );

    mockServer = setupServer(
      ...consumerDataplaneMock.mocks,
      ...providerDataplaneMock.mocks
    );
    mockServer.listen({ onUnhandledRequest: "bypass" });
    await app
      .get(DataPlaneService)
      .addDataPlane(consumerDataplaneMock.dataPlane);
    await app
      .get(DataPlaneService)
      .addDataPlane(providerDataplaneMock.dataPlane);

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
      mockServer.close();
      await server.close();
      await app.close();
    } catch (e) {
      console.error("Error cleaning up resources", e);
    }
  });

  beforeEach(async () => {
    await pipelineExecutor["transferService"][
      "transferEventRepository"
    ].clear();
    await pipelineExecutor["transferService"][
      "transferDetailRepository"
    ].clear();
  });

  it("TP:01-01: Verify transfer request, provider started, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ATP0101-Dataset", "ATP0101")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0101",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
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
          await transferService.terminate(
            transfer.localId,
            "500",
            "Test termination",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.TERMINATED,
        async ({ logger }) => {
          logger.log("Transfer terminated by provider, consumer notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.TERMINATED))
      .execute();
  }, 5000);

  it("TP:01-02: Verify transfer request, provider started, provider completed", async () => {
    await pipelineExecutor
      .newPipeline("ATP0102-Dataset", "ATP0102")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0102",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
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
          await transferService.complete(transfer.localId, true);
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.COMPLETED,
        async ({ logger }) => {
          logger.log("Transfer completed by provider, consumer notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.COMPLETED))
      .execute();
  }, 5000);

  it("TP:01-03: Verify transfer request, provider started, provider suspended, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ATP0103-Dataset", "ATP0103")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0103",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
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
          await transferService.suspend(
            transfer.localId,
            "Test suspension",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "provider",
        TransferState.SUSPENDED,
        async ({ transfer, transferService }) => {
          await transferService.terminate(
            transfer.localId,
            "500",
            "Test termination",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.TERMINATED,
        async ({ logger }) => {
          logger.log("Transfer terminated by provider, consumer notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.TERMINATED))
      .execute();
  }, 5000);

  it("TP:01-04: Verify transfer request, provider started, provider suspended, provider started, provider completed", async () => {
    await pipelineExecutor
      .newPipeline("ATP0104-Dataset", "ATP0104")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0104",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
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
          await transferService.suspend(
            transfer.localId,
            "Test suspension",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "provider",
        TransferState.SUSPENDED,
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
          await transferService.complete(transfer.localId, true);
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.COMPLETED,
        async ({ logger }) => {
          logger.log("Transfer completed by provider, consumer notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.COMPLETED))
      .execute();
  }, 5000);

  it("TP:01-05: Verify transfer request, provider terminated", async () => {
    await pipelineExecutor
      .newPipeline("ATP0105-Dataset", "ATP0105")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0105",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
      .onEvent(
        "transfer",
        "provider",
        TransferState.REQUESTED,
        async ({ transfer, transferService }) => {
          transferService.terminate(
            transfer.localId,
            "500",
            "Test termination",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.TERMINATED,
        async ({ logger }) => {
          logger.log("Transfer terminated by provider, consumer notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.TERMINATED))
      .execute();
  }, 5000);
});
