import {
  AppModule,
  CatalogService,
  DataPlaneService,
  NegotiationService,
  setupApp,
  TransferService
} from "@apps/control-plane-api";
import {
  Body,
  Controller,
  HttpServer,
  INestApplication,
  Post
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppLogger } from "@tsg-dsp/common-api";
import { ContractNegotiationState, Offer } from "@tsg-dsp/common-dsp";

import { PipelineExecutor } from "./pipeline.executor.js";
import { controlPlaneHealthy, setupConfigFile } from "./test.setup.js";

interface NegotiationSignal {
  providerId: string;
  offerId: string;
  datasetId: string;
  connectorAddress: string;
}

@Controller("signal")
class SignalController {
  private resolve!: (value: NegotiationSignal) => void;
  negotiationSignalPromise: Promise<NegotiationSignal> = new Promise(
    (resolve) => {
      this.resolve = resolve;
    }
  );

  @Post("negotiation")
  async negotiationSignal(
    @Body() negotiationSignal: NegotiationSignal
  ): Promise<void> {
    this.resolve(negotiationSignal);
  }
}

describe.skip("TCK", () => {
  let server: HttpServer;
  let app: INestApplication;
  let pipelineExecutor: PipelineExecutor;

  beforeAll(async () => {
    setupConfigFile();
    app = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SignalController]
    })
      .setLogger(new AppLogger())
      .compile()
      .then((m) => m.createNestApplication());

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

  it(
    "ACN0101",
    async () => {
      await pipelineExecutor
        .newPipeline("ACN0101")
        .onSetup(async ({ negotiationService }) => {
          const signal =
            await app.get(SignalController).negotiationSignalPromise;
          await negotiationService.requestNew(
            new Offer({
              id: signal.offerId,
              assigner: signal.providerId
            }),
            signal.datasetId,
            `${signal.connectorAddress}/negotiations`,
            signal.providerId
          );
          // {
          //   connectorAddress: "http://localhost:8083",
          //   providerId: "TCK_PARTICIPANT",
          //   offerId: "offerC0101",
          // }
          // await negotiationService.requestNew();
          console.log(signal);
          // TODO: Request
        })
        .onEvent(
          "negotiation",
          "consumer",
          ContractNegotiationState.OFFERED,
          async () => {
            // Send ACCEPTED
            console.log();
          }
        )
        .onEvent(
          "negotiation",
          "consumer",
          ContractNegotiationState.AGREED,
          async () => {
            // Send VERIFIED
          }
        )
        .onEvent(
          "negotiation",
          "consumer",
          ContractNegotiationState.FINALIZED,
          async () => {
            // Do nothing
          }
        )
        .onComplete(async () => {})
        .execute();
    },
    10 * 60 * 10000
  );
});
