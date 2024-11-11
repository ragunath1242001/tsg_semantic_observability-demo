import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
import { ContractNegotiationState, Offer } from "@tsg-dsp/common-dsp";
import { HttpServer, INestApplication } from "@nestjs/common";
import { NegotiationService } from "@apps/control-plane-api/src/dsp/negotiation/negotiation.service";
import { PipelineExecutor } from "./pipeline.executor";
import { CatalogService } from "@apps/control-plane-api/src/dsp/catalog/catalog.service";
import { setupApp } from "@apps/control-plane-api/src/app.setup";
import { AppLogger } from "@apps/control-plane-api/src/utils/logging";
import { TransferService } from "@apps/control-plane-api/src/dsp/transfer/transfer.service";

describe("TCK Local", () => {
  let server: HttpServer;
  let moduleRef: TestingModule;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;

  let catalogService: CatalogService;
  let negotiationService: NegotiationService;
  let transferService: TransferService;
  beforeAll(async () => {
    try {
      let i = 0;
      process.env.CONFIG_PATH = `${__dirname}/../config.yaml`;
      moduleRef = await Test.createTestingModule({
        imports: [
          (await import("@apps/control-plane-api/src/app.module")).AppModule
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

  it("ACN0101", async () => {
    const dataset = await catalogService.getDataset("ACN0101");
    negotiationService.requestNew(
      dataset.hasPolicy![0] as Offer,
      dataset.id,
      "http://localhost:32490/api/negotiations",
      "did:web:localhost%3A3001"
    );

    await pipelineExecutor.pipelines.ACN0101.completed;

    const negotiations = await negotiationService.getNegotiations();
    expect(negotiations.length).toBe(2);
    expect(negotiations[0].state).toBe(ContractNegotiationState.AGREED);
    expect(negotiations[1].state).toBe(ContractNegotiationState.AGREED);
  });

  it("ACN0102", async () => {
    const dataset = await catalogService.getDataset("ACN0102");
    negotiationService.requestNew(
      dataset.hasPolicy![0] as Offer,
      dataset.id,
      "http://localhost:32490/api/negotiations",
      "did:web:localhost%3A3001"
    );

    await pipelineExecutor.pipelines.ACN0102.completed;

    const negotiations = await negotiationService.getNegotiations();
    expect(negotiations.length).toBe(2);
    expect(negotiations[0].state).toBe(ContractNegotiationState.VERIFIED);
    expect(negotiations[1].state).toBe(ContractNegotiationState.VERIFIED);
  });

  it("ACN0103", async () => {
    const dataset = await catalogService.getDataset("ACN0103");
    negotiationService.requestNew(
      dataset.hasPolicy![0] as Offer,
      dataset.id,
      "http://localhost:32490/api/negotiations",
      "did:web:localhost%3A3001"
    );

    await pipelineExecutor.pipelines.ACN0103.completed;

    const negotiations = await negotiationService.getNegotiations();
    expect(negotiations.length).toBe(2);
    expect(negotiations[0].state).toBe(ContractNegotiationState.FINALIZED);
    expect(negotiations[1].state).toBe(ContractNegotiationState.FINALIZED);
  });
});
