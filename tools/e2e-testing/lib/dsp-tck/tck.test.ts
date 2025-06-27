import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SetupServer, setupServer } from "msw/node";

import { setupDataPlaneMock } from "../dataPlane.mock.js";
import { ensureStoppedRuntime, execTck } from "../exec-tck.js";
import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import * as CAT from "./CAT_01.js";
import * as CN_01 from "./CN_01.js";
import * as CN_02 from "./CN_02.js";
import * as CN_03 from "./CN_03.js";
import * as CN_C_01 from "./CN_C_01.js";
import * as CN_C_02 from "./CN_C_02.js";
import * as CN_C_03 from "./CN_C_03.js";
import * as TP_01 from "./TP_01.js";
import * as TP_02 from "./TP_02.js";
import * as TP_03 from "./TP_03.js";
import * as TP_C_01 from "./TP_C_01.js";
import * as TP_C_02 from "./TP_C_02.js";
import * as TP_C_03 from "./TP_C_03.js";

function expectResolvesWithin(
  name: string,
  promise: Promise<any>,
  timeout: number
): Promise<void> {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(`Test ${name} not fulfilled`), timeout)
    )
  ]) as Promise<void>;
}

describe("DSP TCK", () => {
  const debug = "CI" in process.env === false;
  const timeout = 50 * 1000;
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;
  let mockServer: SetupServer;
  let signalController: SignalController;

  const disabledTests: [string, string][] = [
    ["TP_02_04", "Disabled in TCK runtime"],
    ["TP_C_02_04", "Disabled in TCK runtime"]
  ];

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
    const { ensureTckRuntime } = await import("../exec-tck.js");
    await ensureTckRuntime(
      "https://dsptestcontext.blob.core.windows.net/tck/dsp-tck-runtime-2025-06-20.jar"
    );
    const builder = Test.createTestingModule({
      imports: [AppModule],
      controllers: [SignalController]
    });
    if (debug) {
      builder.setLogger(new AppLogger());
    } else {
      builder.setLogger(new AppLogger("error"));
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

    signalController = app.get(SignalController);

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
      await ensureStoppedRuntime();
    } catch (e) {
      console.error("Error cleaning up resources", e);
    }
  });

  it(
    "Test suite",
    async () => {
      const tests = await Promise.allSettled([
        ...getTestsFromModule(CAT),
        ...getTestsFromModule(CN_01),
        ...getTestsFromModule(CN_02),
        ...getTestsFromModule(CN_03),
        ...getTestsFromModule(CN_C_01),
        ...getTestsFromModule(CN_C_02),
        ...getTestsFromModule(CN_C_03),
        ...getTestsFromModule(TP_01),
        ...getTestsFromModule(TP_02),
        ...getTestsFromModule(TP_03),
        ...getTestsFromModule(TP_C_01),
        ...getTestsFromModule(TP_C_02),
        ...getTestsFromModule(TP_C_03),
        expectResolvesWithin("execTck", execTck(debug), timeout)
      ]);
      const rejectedTests = tests
        .filter((test) => test.status === "rejected")
        .map((test) => (test as PromiseRejectedResult).reason);
      expect(rejectedTests).toHaveLength(0);
    },
    timeout + 10 * 1000
  );

  function getTestsFromModule(module: {
    [key: string]: (
      pipelineExecutor: PipelineExecutor,
      signalController: any
    ) => Promise<unknown>;
  }): Promise<unknown>[] {
    return Object.keys(module).map((key) => {
      if (disabledTests.some((test) => test[0] === key)) {
        return Promise.resolve(`Test ${key} is disabled`);
      }
      return expectResolvesWithin(
        key,
        module[key](pipelineExecutor, signalController),
        timeout
      );
    });
  }
});
