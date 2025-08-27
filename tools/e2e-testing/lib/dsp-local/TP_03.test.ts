import { DspClientService } from "@apps/control-plane-api/dist/dsp/client/client.service.js";
import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  Multilanguage,
  TransferCompletionMessage,
  TransferStartMessage,
  TransferState,
  TransferSuspensionMessage
} from "@tsg-dsp/common-dsp";
import { SetupServer, setupServer } from "msw/node";

import { setupDataPlaneMock } from "../dataPlane.mock.js";
import { PipelineExecutor } from "../pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";

describe("Local - TP_03: Transfer request provider negative scenarios", () => {
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

  it("TP:03-01: Verify transfer request, consumer completed", async () => {
    await pipelineExecutor
      .newPipeline("ATP0301-Dataset", "ATP0301")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0301",
          "http://localhost:32490/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
      .onEvent(
        "transfer",
        "consumer",
        TransferState.REQUESTED,
        async ({ transfer, transferService }) => {
          await expect(
            transferService.complete(transfer.localId, true)
          ).rejects.toThrow("cannot transition from REQUESTED to COMPLETED");

          const dsp: DspClientService = transferService["dsp"];
          await expect(
            dsp.completeTransfer(
              `${transfer.remoteAddress}/completion`,
              new TransferCompletionMessage({
                providerPid: transfer.remoteId!,
                consumerPid: transfer.localId
              }),
              transfer.remoteParty
            )
          ).rejects.toThrow("cannot transition from REQUESTED to COMPLETED");
        }
      )
      .execute();
  }, 5000);

  it("TP:03-02: Verify transfer request, consumer suspended", async () => {
    await pipelineExecutor
      .newPipeline("ATP0302-Dataset", "ATP0302")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0302",
          "http://localhost:32490/transfers",
          "did:web:localhost%3A32490",
          "HttpData-PULL"
        );
      })
      .onEvent(
        "transfer",
        "consumer",
        TransferState.REQUESTED,
        async ({ transfer, transferService }) => {
          await expect(
            transferService.suspend(transfer.localId, "Test suspension", true)
          ).rejects.toThrow("cannot transition from REQUESTED to SUSPENDED");

          const dsp: DspClientService = transferService["dsp"];
          await expect(
            dsp.suspendTransfer(
              `${transfer.remoteAddress}/suspension`,
              new TransferSuspensionMessage({
                providerPid: transfer.remoteId!,
                consumerPid: transfer.localId,
                reason: [new Multilanguage("Test suspension")]
              }),
              transfer.remoteParty
            )
          ).rejects.toThrow("cannot transition from REQUESTED to SUSPENDED");
        }
      )
      .execute();
  }, 5000);

  it("TP:03-03: Verify transfer request, provider started, consumer suspended, consumer completed", async () => {
    await pipelineExecutor
      .newPipeline("ATP0303-Dataset", "ATP0303")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0303",
          "http://localhost:32490/transfers",
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
          await expect(
            transferService.complete(transfer.localId, true)
          ).rejects.toThrow("cannot transition from SUSPENDED to COMPLETED");

          const dsp: DspClientService = transferService["dsp"];
          await expect(
            dsp.completeTransfer(
              `${transfer.remoteAddress}/completion`,
              new TransferCompletionMessage({
                providerPid: transfer.remoteId!,
                consumerPid: transfer.localId
              }),
              transfer.remoteParty
            )
          ).rejects.toThrow("cannot transition from SUSPENDED to COMPLETED");
        }
      )
      .execute();
  }, 5000);

  it("TP:03-04: Verify transfer request, provider started, consumer terminated, consumer started", async () => {
    await pipelineExecutor
      .newPipeline("ATP0304-Dataset", "ATP0304")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0304",
          "http://localhost:32490/transfers",
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
        "consumer",
        TransferState.STARTED,
        async ({ transfer, transferService }) => {
          await transferService.terminate(
            transfer.localId,
            "500",
            "Test suspension",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.TERMINATED,
        async ({ transfer, transferService }) => {
          await expect(
            transferService.start(transfer.localId, undefined, true)
          ).rejects.toThrow("cannot transition from TERMINATED to STARTED");

          const dsp: DspClientService = transferService["dsp"];
          await expect(
            dsp.startTransfer(
              `${transfer.remoteAddress}/start`,
              new TransferStartMessage({
                providerPid: transfer.remoteId!,
                consumerPid: transfer.localId
              }),
              transfer.remoteParty
            )
          ).rejects.toThrow("cannot transition from TERMINATED to STARTED");
        }
      )
      .execute();
  }, 5000);

  it("TP:03-05: Verify transfer request, provider started, consumer terminated, consumer suspended", async () => {
    await pipelineExecutor
      .newPipeline("ATP0305-Dataset", "ATP0305")
      .onSetup(async ({ transferService }) => {
        await transferService.initiateTransferProcess(
          "ATP0305",
          "http://localhost:32490/transfers",
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
        "consumer",
        TransferState.STARTED,
        async ({ transfer, transferService }) => {
          await transferService.terminate(
            transfer.localId,
            "500",
            "Test suspension",
            true
          );
        }
      )
      .onEvent(
        "transfer",
        "consumer",
        TransferState.TERMINATED,
        async ({ transfer, transferService }) => {
          await expect(
            transferService.suspend(transfer.localId, "Test suspension", true)
          ).rejects.toThrow("cannot transition from TERMINATED to SUSPENDED");

          const dsp: DspClientService = transferService["dsp"];
          await expect(
            dsp.suspendTransfer(
              `${transfer.remoteAddress}/suspension`,
              new TransferSuspensionMessage({
                providerPid: transfer.remoteId!,
                consumerPid: transfer.localId,
                reason: [new Multilanguage("Test suspension")]
              }),
              transfer.remoteParty
            )
          ).rejects.toThrow("cannot transition from TERMINATED to SUSPENDED");
        }
      )
      .execute();
  }, 5000);
});
