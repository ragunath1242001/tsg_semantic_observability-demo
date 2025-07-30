import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToClass } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { RootConfig } from "../config.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { ManagementClientMock } from "./management-client.mock.js";
import { ManagementClient } from "./management-client.service.js";
import { TransferDao } from "./transfer.dao.js";
import { TransfersService } from "./transfers.service.js";

describe("TransfersService", () => {
  let transfersService: TransfersService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, {
      server: {}
    });

    server = setupServer(
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json({
          service: [
            {
              type: "connector",
              serviceEndpoint: "http://remotecontrolplane/"
            }
          ]
        });
      })
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
        TransfersService,
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ManagementClient,
          useValue: ManagementClientMock
        }
      ]
    }).compile();

    transfersService = module.get(TransfersService);
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
      const response = await transfersService.transferStart(transferProcessId);
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Complete transfer", async () => {
      const response =
        await transfersService.transferComplete(transferProcessId);
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Terminate transfer", async () => {
      const response = await transfersService.transferTerminate(
        transferProcessId,
        "CODE",
        "REASON"
      );
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Suspend transfer", async () => {
      const response = await transfersService.transferSuspend(
        transferProcessId,
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
