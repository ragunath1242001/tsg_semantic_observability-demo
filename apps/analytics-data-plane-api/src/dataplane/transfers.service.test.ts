import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ControlPlaneConfig,
  createDataPlaneHttpMocks,
  createDataPlaneManagementHttpMocks,
  createDidConnectorHttpMocks,
  ITransferHandler,
  NegotiationClientService,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import { plainToClass } from "class-transformer";
import { SetupServer, setupServer } from "msw/node";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { RootConfig } from "../config.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { AnalyticsTransferHandler } from "./analytics-transfer-handler.service.js";
import { TransferDao } from "./transfer.dao.js";

describe("TransfersService", () => {
  let transfersService: AnalyticsTransferHandler;
  let transferClient: TransferClientService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        initializationDelay: 1
      }
    });

    server = setupServer(
      ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint),
      ...createDataPlaneManagementHttpMocks(
        config.controlPlane.managementEndpoint
      ),
      ...createDidConnectorHttpMocks()
    );
    server.listen({ onUnhandledRequest: "error" });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao
        ])
      ],
      providers: [
        AuthClientService,
        CatalogClientService,
        NegotiationClientService,
        TransferClientService,
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ControlPlaneConfig,
          useValue: config.controlPlane
        },
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: ITransferHandler,
          useClass: AnalyticsTransferHandler
        }
      ]
    }).compile();
    await module.init();

    transfersService = module.get(ITransferHandler);
    transferClient = module.get(TransferClientService);
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Provider process", () => {
    let transferProcessId = "urn:uuid:4904fd10-05c0-40fe-99f8-ce4a7d336c4f";

    it("Transfer request", async () => {
      const result = await transfersService.handleTransferRequest(
        {
          "@type": "TransferRequestMessage",
          agreementId: "urn:uuid:cadb401e-4275-4d77-99a2-5aa2af93e3b7",
          format: "tsg:HTTP",
          callbackAddress: "http://127.0.0.1/test",
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        "provider",
        transferProcessId,
        "did:web:localhost",
        "urn:uuid:test"
      );
      transferProcessId = result.identifier;
      expect(result.dataAddress).toBeDefined();
    });

    it("Get transfers for transport", async () => {
      const transfers = await transfersService.getTransfers();
      expect(transfers).toHaveLength(1);

      const existingTransfer = await transfersService.getTransferById(
        transfers[0].id
      );
      expect(existingTransfer).toBeDefined();

      await expect(transfersService.getTransferById("unknown")).rejects.toThrow(
        "not found"
      );
    });

    it("Transfer start", async () => {
      await transfersService.handleTransferStart(
        {
          "@type": "TransferStartMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Transfer completion", async () => {
      await transfersService.handleTransferComplete(
        {
          "@type": "TransferCompletionMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Request metadata", async () => {
      const metadata = await transfersService.getMetadata(transferProcessId);
      expect(metadata.agreement).toBeDefined();
      expect(metadata.dataset).toBeDefined();
    });

    it("Start transfer", async () => {
      const response = await transferClient.transferStart({
        id: "test",
        processId: transferProcessId
      });
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Complete transfer", async () => {
      const response = await transferClient.transferComplete({
        id: "test",
        processId: transferProcessId
      });
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Terminate transfer", async () => {
      const response = await transferClient.transferTerminate(
        {
          id: "test",
          processId: transferProcessId
        },
        "CODE",
        "REASON"
      );
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Suspend transfer", async () => {
      const response = await transferClient.transferSuspend(
        {
          id: "test",
          processId: transferProcessId
        },
        "REASON"
      );
      expect(response).toStrictEqual({ status: "OK" });
    });
  });

  describe("Consumer process", () => {
    let transferProcessId = "urn:uuid:dab7264b-7ff4-4182-9e89-6238a57b5006";

    it("Transfer Request", async () => {
      const result = await transfersService.handleTransferRequest(
        {
          "@type": "TransferRequestMessage",
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
          agreementId: "urn:uuid:e785d4a8-2030-4a2b-b223-9881e35c0df7",
          format: "tsg:HTTP",
          callbackAddress: "http://127.0.0.1/test"
        },
        "consumer",
        transferProcessId,
        "did:web:localhost",
        "urn:uuid:test"
      );
      transferProcessId = result.identifier;
    });

    it("Transfer start", async () => {
      await transfersService.handleTransferStart(
        {
          "@type": "TransferStartMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
          dataAddress: {
            "@type": "DataAddress",
            endpoint: "https://httpbin.org/anything",
            endpointType: "tsg:HTTP",
            endpointProperties: [
              {
                "@type": "EndpointProperty",
                name: "Authorization",
                value: "Bearer ABCDEF"
              }
            ]
          }
        },
        transferProcessId
      );
    });

    it("Transfer completion", async () => {
      await transfersService.handleTransferComplete(
        {
          "@type": "TransferCompletionMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });
  });
});
