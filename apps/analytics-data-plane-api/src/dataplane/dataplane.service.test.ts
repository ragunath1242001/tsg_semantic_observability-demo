import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  AgreementDto,
  DataPlaneCreation,
  DatasetDto,
  defaultContext
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { AnalysesService } from "../analyses/analyses.service.js";
import { AnalysisDao } from "../analyses/dao/analysis.dao.js";
import { LoggingConfig, RootConfig } from "../config.js";
import { AlgorithmEventDao } from "../events/dao/algorithm-event.dao.js";
import { InternalEventDao } from "../events/dao/internal-event.dao.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { DataPlaneService } from "./dataplane.service.js";
import { TransferDao } from "./transfer.dao.js";

describe("Dataplane Service", () => {
  let dataPlaneService: DataPlaneService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initialDataset: DatasetDto = {
      "@context": defaultContext(),
      "@type": "Dataset",
      "@id": "urn:uuid:test",
      title: "HTTPBin",
      hasPolicy: [
        {
          "@type": "Offer",
          "@id": "urn:uuid:3fdbf466-b2de-45ef-bc9b-215267091ed0",
          assigner: "did:web:localhost",
          permission: [
            {
              "@type": "Permission",
              action: "use"
            }
          ]
        }
      ],
      distribution: [
        {
          "@type": "Distribution",
          "@id": "urn:uuid:f2f7c1a0-51b9-4383-b084-d4a7e524f61f",
          conformsTo: ["https://httpbin.org/spec.json"],
          format: "tsg:analytics",
          title: "HTTPBin"
        }
      ]
    };
    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        authorization: "Basic YWRtaW46YWRtaW4=",
        initializationDelay: 1
      },
      dataset: [initialDataset],
      logging: {
        debug: true
      }
    });

    server = setupServer(
      http.post<PathParams, DataPlaneCreation>(
        `${config.controlPlane.dataPlaneEndpoint}/init`,
        async ({ request }) => {
          const requestBody = await request.json();
          return HttpResponse.json({
            ...requestBody,
            identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9"
          });
        }
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/catalog`,
        ({ request }) => {
          return HttpResponse.json(request.json());
        }
      ),
      http.post(
        `${config.controlPlane.managementEndpoint}/transfers/:processId/:action`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.get(
        `${config.controlPlane.managementEndpoint}/agreements/:agreementId`,
        () => {
          return HttpResponse.json<AgreementDto>({
            "@context": defaultContext(),
            "@type": "Agreement",
            "@id": "urn:uuid:test",
            assigner: "did:web:localhost",
            assignee: "did:web:localhost",
            timestamp: new Date().toISOString(),
            target: "urn:uuid:dataset"
          });
        }
      ),
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json({
          service: [
            {
              type: "connector",
              serviceEndpoint: "http://remotecontrolplane/"
            }
          ]
        });
      }),
      http.get(
        `${config.controlPlane.managementEndpoint}/catalog/dataset`,
        () => {
          return HttpResponse.json<DatasetDto>({
            "@context": defaultContext(),
            "@type": "Dataset",
            "@id": "urn:uuid:test"
          });
        }
      ),
      http.post("https://httpbin.org/anything/0.9.2/anything/test", () => {
        return HttpResponse.json({
          args: {
            filter: "filterQueryString"
          },
          data: '{"test":"test2"}',
          files: {},
          form: {},
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, compress, deflate, br",
            "Content-Length": "16",
            "Content-Type": "application/json",
            Host: "httpbin.org",
            "User-Agent": "axios/1.5.0",
            "X-Amzn-Trace-Id": "Root=1-6571e4ca-792829da6e6bcb6115862d0b"
          },
          json: {
            test: "test2"
          },
          method: "POST",
          origin: "0.0.0.0",
          url: "https://httpbin.org/anything/0.9.2/anything/test"
        });
      })
    );

    server.listen({ onUnhandledRequest: "bypass" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AnalysisDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AnalysisDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ])
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        LoggingService,
        AuthClientService,
        AnalysesService,
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: LoggingConfig,
          useValue: { debug: true }
        },
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    dataPlaneService = moduleRef.get(DataPlaneService);
    await expect(dataPlaneService.getStateDto()).rejects.toThrow(
      "No state available yet"
    );

    await new Promise((r) => setTimeout(r, 20));
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Provider process", () => {
    let transferProcessId = "urn:uuid:4904fd10-05c0-40fe-99f8-ce4a7d336c4f";

    it("Get state", async () => {
      await dataPlaneService.initialized;
      await new Promise((r) => setTimeout(r, 100));
      const state = await dataPlaneService.getStateDto();
      expect(state.dataset?.length).toBeGreaterThanOrEqual(1);
      expect(state.identifier).toBeDefined();
      expect(state.details).toBeDefined();
    });

    it("Transfer request", async () => {
      const result = await dataPlaneService.handleTransferRequest(
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
      const transfers = await dataPlaneService.getTransfers();
      expect(transfers).toHaveLength(1);

      const existingTransfer = await dataPlaneService.getTransferById(
        transfers[0].id
      );
      expect(existingTransfer).toBeDefined();

      await expect(dataPlaneService.getTransferById("unknown")).rejects.toThrow(
        "not found"
      );
    });

    it("Transfer start", async () => {
      await dataPlaneService.handleTransferStart(
        {
          "@type": "TransferStartMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Transfer completion", async () => {
      await dataPlaneService.handleTransferComplete(
        {
          "@type": "TransferCompletionMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Request metadata", async () => {
      const metadata = await dataPlaneService.getMetadata(transferProcessId);
      expect(metadata.agreement).toBeDefined();
      expect(metadata.dataset).toBeDefined();
    });

    it("Start transfer", async () => {
      const response = await dataPlaneService.transferStart(transferProcessId);
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Complete transfer", async () => {
      const response =
        await dataPlaneService.transferComplete(transferProcessId);
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Terminate transfer", async () => {
      const response = await dataPlaneService.transferTerminate(
        transferProcessId,
        "CODE",
        "REASON"
      );
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Suspend transfer", async () => {
      const response = await dataPlaneService.transferSuspend(
        transferProcessId,
        "REASON"
      );
      expect(response).toStrictEqual({ status: "OK" });
    });
  });

  describe("Consumer process", () => {
    let transferProcessId = "urn:uuid:dab7264b-7ff4-4182-9e89-6238a57b5006";

    it("Transfer Request", async () => {
      const result = await dataPlaneService.handleTransferRequest(
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
      await dataPlaneService.handleTransferStart(
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
      await dataPlaneService.handleTransferComplete(
        {
          "@type": "TransferCompletionMessage",
          providerPid: transferProcessId,
          consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });
  });
  describe("Config management", () => {
    it("Update config", async () => {
      await dataPlaneService.updateDatasets([]);
      const config = await dataPlaneService.getDatasets();
      expect(config).toHaveLength(0);
    });
  });
});

describe("Dataplane Service Consumer", () => {
  let dataPlaneService: DataPlaneService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        authorization: "Basic YWRtaW46YWRtaW4=",
        initializationDelay: 1
      },
      dataset: undefined,
      logging: {
        debug: true
      }
    });

    server = setupServer(
      http.post<PathParams, DataPlaneCreation>(
        `${config.controlPlane.dataPlaneEndpoint}/init`,
        async ({ request }) => {
          const requestBody = await request.json();
          return HttpResponse.json({
            ...requestBody,
            identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9"
          });
        }
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/catalog`,
        async ({ request }) => {
          return HttpResponse.json(await request.json());
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AnalysisDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AnalysisDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ])
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        LoggingService,
        AuthClientService,
        AnalysesService,
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: LoggingConfig,
          useValue: { debug: true }
        },
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    dataPlaneService = moduleRef.get(DataPlaneService);
    await expect(dataPlaneService.getStateDto()).rejects.toThrow(
      "No state available yet"
    );

    await new Promise((r) => setTimeout(r, 20));
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Initial state", () => {
    it("Add dataset config", async () => {
      await dataPlaneService.initialized;
      await new Promise((r) => setTimeout(r, 100));
      expect(await dataPlaneService.getDatasets()).toHaveLength(1);
      await dataPlaneService.updateDatasets([
        {
          "@context": defaultContext(),
          "@type": "Dataset",
          "@id": "urn:uuid:test"
        }
      ]);
      const config = await dataPlaneService.getDatasets();
      expect(config).toHaveLength(1);
    });
  });
});
