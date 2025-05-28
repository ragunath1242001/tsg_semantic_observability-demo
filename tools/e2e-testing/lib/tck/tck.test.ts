import {
  AppModule,
  CatalogService,
  DataPlaneService,
  NegotiationService,
  setupApp,
  TransferService
} from "@apps/control-plane-api";
import { HttpServer, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppLogger } from "@tsg-dsp/common-api";
import { SetupServer, setupServer } from "msw/node";

import { setupDataPlaneMock } from "../dataPlane.mock.js";
import { ensureTckRuntime, execTck } from "../exec-tck.js";
import { PipelineExecutor } from "../pipeline.executor.js";
import { SignalController } from "../signal.controller.js";
import { controlPlaneHealthy, setupConfigFile } from "../test.setup.js";
import { CAT_01_01, CAT_01_02, CAT_01_03 } from "./CAT_01.js";
import { CN_01_01, CN_01_02, CN_01_03, CN_01_04 } from "./CN_01.js";
import {
  CN_02_01,
  CN_02_02,
  CN_02_03,
  CN_02_04,
  CN_02_05,
  CN_02_06,
  CN_02_07
} from "./CN_02.js";
import { CN_03_01, CN_03_02, CN_03_03, CN_03_04 } from "./CN_03.js";
import { CN_C_01_01, CN_C_01_02, CN_C_01_03, CN_C_01_04 } from "./CN_C_01.js";
import {
  CN_C_02_01,
  CN_C_02_02,
  CN_C_02_03,
  CN_C_02_04,
  CN_C_02_05,
  CN_C_02_06
} from "./CN_C_02.js";
import {
  CN_C_03_01,
  CN_C_03_02,
  CN_C_03_03,
  CN_C_03_04,
  CN_C_03_05,
  CN_C_03_06
} from "./CN_C_03.js";
import { TP_01_01, TP_01_02, TP_01_03, TP_01_04, TP_01_05 } from "./TP_01.js";
import { TP_02_01, TP_02_02, TP_02_03, TP_02_04, TP_02_05 } from "./TP_02.js";
import {
  TP_03_01,
  TP_03_02,
  TP_03_03,
  TP_03_04,
  TP_03_05,
  TP_03_06
} from "./TP_03.js";
import {
  TP_C_01_01,
  TP_C_01_02,
  TP_C_01_03,
  TP_C_01_04,
  TP_C_01_05
} from "./TP_C_01.js";
import {
  TP_C_02_01,
  TP_C_02_02,
  TP_C_02_03,
  TP_C_02_04,
  TP_C_02_05
} from "./TP_C_02.js";
import {
  TP_C_03_01,
  TP_C_03_02,
  TP_C_03_03,
  TP_C_03_04,
  TP_C_03_05,
  TP_C_03_06
} from "./TP_C_03.js";

describe("TCK", () => {
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;
  let mockServer: SetupServer;

  beforeAll(async () => {
    setupConfigFile();
    await ensureTckRuntime();
    const builder = Test.createTestingModule({
      imports: [AppModule],
      controllers: [SignalController]
    });
    if ("CI" in process.env === false) {
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
    await pipelineExecutor["negotiationService"][
      "negotiationProcessEventRepository"
    ].clear();
    await pipelineExecutor["negotiationService"][
      "negotiationDetailRepository"
    ].clear();
  });

  it(
    "Test suite",
    async () => {
      const signalController = app.get(SignalController);
      await Promise.all([
        CAT_01_01(pipelineExecutor),
        CAT_01_02(pipelineExecutor),
        CAT_01_03(pipelineExecutor),
        TP_01_01(pipelineExecutor),
        TP_01_02(pipelineExecutor),
        TP_01_03(pipelineExecutor),
        TP_01_04(pipelineExecutor),
        TP_01_05(pipelineExecutor),
        TP_02_01(pipelineExecutor),
        TP_02_02(pipelineExecutor),
        TP_02_03(pipelineExecutor),
        TP_02_04(pipelineExecutor),
        TP_02_05(pipelineExecutor),
        TP_03_01(pipelineExecutor),
        TP_03_02(pipelineExecutor),
        TP_03_03(pipelineExecutor),
        TP_03_04(pipelineExecutor),
        TP_03_05(pipelineExecutor),
        TP_03_06(pipelineExecutor),
        TP_C_01_01(pipelineExecutor, signalController),
        TP_C_01_02(pipelineExecutor, signalController),
        TP_C_01_03(pipelineExecutor, signalController),
        TP_C_01_04(pipelineExecutor, signalController),
        TP_C_01_05(pipelineExecutor, signalController),
        TP_C_02_01(pipelineExecutor, signalController),
        TP_C_02_02(pipelineExecutor, signalController),
        TP_C_02_03(pipelineExecutor, signalController),
        TP_C_02_04(pipelineExecutor, signalController),
        TP_C_02_05(pipelineExecutor, signalController),
        TP_C_03_01(pipelineExecutor, signalController),
        TP_C_03_02(pipelineExecutor, signalController),
        TP_C_03_03(pipelineExecutor, signalController),
        TP_C_03_04(pipelineExecutor, signalController),
        TP_C_03_05(pipelineExecutor, signalController),
        TP_C_03_06(pipelineExecutor, signalController),
        CN_C_01_01(pipelineExecutor, signalController),
        CN_C_01_02(pipelineExecutor, signalController),
        CN_C_01_03(pipelineExecutor, signalController),
        CN_C_01_04(pipelineExecutor, signalController),
        CN_C_02_01(pipelineExecutor, signalController),
        CN_C_02_02(pipelineExecutor, signalController),
        CN_C_02_03(pipelineExecutor, signalController),
        CN_C_02_04(pipelineExecutor, signalController),
        CN_C_02_05(pipelineExecutor, signalController),
        CN_C_02_06(pipelineExecutor, signalController),
        CN_C_03_01(pipelineExecutor, signalController),
        CN_C_03_02(pipelineExecutor, signalController),
        CN_C_03_03(pipelineExecutor, signalController),
        CN_C_03_04(pipelineExecutor, signalController),
        CN_C_03_05(pipelineExecutor, signalController),
        CN_C_03_06(pipelineExecutor, signalController),
        CN_01_01(pipelineExecutor),
        CN_01_02(pipelineExecutor),
        CN_01_03(pipelineExecutor),
        CN_01_04(pipelineExecutor),
        CN_02_01(pipelineExecutor),
        CN_02_02(pipelineExecutor),
        CN_02_03(pipelineExecutor),
        CN_02_04(pipelineExecutor),
        CN_02_05(pipelineExecutor),
        CN_02_06(pipelineExecutor),
        CN_02_07(pipelineExecutor),
        CN_03_01(pipelineExecutor),
        CN_03_02(pipelineExecutor),
        CN_03_03(pipelineExecutor),
        CN_03_04(pipelineExecutor),
        execTck()
      ]);
    },
    10 * 60 * 10000
  );
});
