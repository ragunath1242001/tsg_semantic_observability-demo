import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, INestApplication } from "@nestjs/common";
import { NegotiationService } from "@apps/control-plane-api/src/dsp/negotiation/negotiation.service.js";
import { PipelineExecutor } from "./pipeline.executor.js";
import { CatalogService } from "@apps/control-plane-api/src/dsp/catalog/catalog.service.js";
import { setupApp } from "@apps/control-plane-api/src/app.setup.js";
import { TransferService } from "@apps/control-plane-api/src/dsp/transfer/transfer.service.js";
import { AppLogger } from "@tsg-dsp/common-api";
import { VCAuthService } from "@apps/control-plane-api/src/vc-auth/vc.auth.service.js";

describe.skip("TCK", () => {
  let server: HttpServer;
  let moduleRef: TestingModule;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;

  let catalogService: CatalogService;
  let negotiationService: NegotiationService;
  let transferService: TransferService;
  beforeAll(async () => {
    try {
      process.env.CONFIG_PATH = `${__dirname}/../config.yaml`;
      moduleRef = await Test.createTestingModule({
        imports: [
          (await import("@apps/control-plane-api/src/app.module.js")).AppModule
        ]
      })
        .setLogger(new AppLogger())
        .compile();
      app = moduleRef.createNestApplication();
      const config = setupApp(app);
      server = await app.listen(config.port, config.listen);
      let started = false;
      for (const i of [...Array(100).keys()]) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const result = await axios.get(`http://localhost:32490/health`);
          if (result.status === 200) {
            started = true;
            break;
          }
        } catch (e) {}
      }
      if (!started) {
        throw new Error("App did not start within 10 seconds");
      }
      catalogService = app.get(CatalogService);
      negotiationService = app.get(NegotiationService);
      transferService = app.get(TransferService);
      await catalogService.initialized;

      pipelineExecutor = new PipelineExecutor(
        config.port,
        catalogService,
        negotiationService,
        transferService
      );
      await pipelineExecutor.init();
    } catch (e) {}
  });

  afterAll(async () => {
    try {
      pipelineExecutor.close();
      await server.close();
      await app.close();
      await moduleRef.close();
    } catch (e) {}
  });

  beforeEach(async () => {
    await negotiationService["negotiationProcessEventRepository"].clear();
    await negotiationService["negotiationDetailRepository"].clear();
  });

  it(
    "ACN0101",
    async () => {
      console.log(
        await app.get(VCAuthService).requestToken("did:web:localhost%3A3001")
      );

      await pipelineExecutor.pipelines.ACN0101.completed;
    },
    10 * 60 * 1000
  );
});
