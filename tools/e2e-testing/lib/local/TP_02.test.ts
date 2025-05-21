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
import { TransferState } from "@tsg-dsp/common-dsp";
import { SetupServer, setupServer } from "msw/node";

import { setupDataPlaneMock } from "../dataPlane.mock.js";
import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import { expectedTransferState } from "../types.js";

describe("Local - TP_02: Transfer request provider scenarios", () => {
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;
  let mockServer: SetupServer;

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

    const consumerDataplaneMock = setupDataPlaneMock(
      "consumer",
      "CD-1",
      "tsg:dummy"
    );
    const providerDataplaneMock = setupDataPlaneMock(
      "provider",
      "PD-1",
      "tsg:dummy"
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

  it("TP:02-01: Verify transfer request, provider started, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ATP0201-Dataset", "ATP0201")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0201",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "tsg:dummy"
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
        "consumer",
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
        "provider",
        TransferState.TERMINATED,
        async ({ logger }) => {
          logger.log("Transfer terminated by consumer, provider notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.TERMINATED))
      .execute();
  }, 5000);

  it("TP:02-02: Verify transfer request, provider started, consumer completed", async () => {
    await pipelineExecutor
      .newPipeline("ATP0202-Dataset", "ATP0202")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0202",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "tsg:dummy"
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
        "consumer",
        TransferState.STARTED,
        async ({ transfer, transferService }) => {
          await transferService.complete(transfer.localId, true);
        }
      )
      .onEvent(
        "transfer",
        "provider",
        TransferState.COMPLETED,
        async ({ logger }) => {
          logger.log("Transfer completed by consumer, provider notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.COMPLETED))
      .execute();
  }, 5000);

  it("TP:02-03: Verify transfer request, provider started, consumer suspended, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ATP0203-Dataset", "ATP0203")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0203",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "tsg:dummy"
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
        "consumer",
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
        "consumer",
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
        "provider",
        TransferState.TERMINATED,
        async ({ logger }) => {
          logger.log("Transfer terminated by consumer, provider notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.TERMINATED))
      .execute();
  }, 5000);

  it("TP:02-04: Verify transfer request, provider started, consumer suspended, consumer started, consumer completed", async () => {
    await pipelineExecutor
      .newPipeline("ATP0204-Dataset", "ATP0204")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0204",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "tsg:dummy"
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
        "consumer",
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
        "consumer",
        TransferState.SUSPENDED,
        async ({ transfer, transferService }) => {
          await transferService.start(transfer.localId, undefined, true);
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.STARTED,
        async ({ transfer, transferService }) => {
          await transferService.complete(transfer.localId, true);
        }
      )
      .onEvent(
        "transfer",
        "provider",
        TransferState.COMPLETED,
        async ({ logger }) => {
          logger.log("Transfer completed by consumer, provider notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.COMPLETED))
      .execute();
  }, 5000);

  it("TP:02-05: Verify transfer request, consumer terminated", async () => {
    await pipelineExecutor
      .newPipeline("ATP0205-Dataset", "ATP0205")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0205",
          "http://localhost:32490/api/transfers",
          "did:web:localhost%3A32490",
          "tsg:dummy"
        );
      })
      .onEvent(
        "transfer",
        "consumer",
        TransferState.REQUESTED,
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
        "provider",
        TransferState.TERMINATED,
        async ({ logger }) => {
          logger.log("Transfer terminated by consumer, provider notified");
        }
      )
      .onComplete(expectedTransferState(TransferState.TERMINATED))
      .execute();
  }, 5000);
});
