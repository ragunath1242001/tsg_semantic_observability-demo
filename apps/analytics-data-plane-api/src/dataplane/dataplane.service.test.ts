import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneService } from "./dataplane.service";
import { DataPlaneController } from "./dataplane.controller";
import { plainToClass } from "class-transformer";
import { AuthConfig, LoggingConfig, RootConfig } from "../config";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import { Request } from "express";
import {
  AgreementDto,
  DataPlaneCreation,
  DatasetDto
} from "@tsg-dsp/common-dsp";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { TransferDao } from "./transfer.dao";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao";
import { AuthClientService } from "../auth/auth.client.service";
import { RawBodyRequest } from "@nestjs/common";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao";
import { LoggingService } from "../logging/logging.service";

describe("Dataplane Service", () => {
  let dataPlaneService: DataPlaneService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initialDataset: DatasetDto = {
      "@context": "https://w3id.org/dspace/2024/1/context.json",
      "@type": "dcat:Dataset",
      "@id": "urn:uuid:test",
      "dct:title": "HTTPBin",
      "odrl:hasPolicy": [
        {
          "@type": "odrl:Offer",
          "@id": "urn:uuid:3fdbf466-b2de-45ef-bc9b-215267091ed0",
          "odrl:assigner": "did:web:localhost",
          "odrl:permission": [
            {
              "@type": "odrl:Permission",
              "odrl:action": "odrl:use"
            }
          ]
        }
      ],
      "dcat:distribution": [
        {
          "@type": "dcat:Distribution",
          "@id": "urn:uuid:f2f7c1a0-51b9-4383-b084-d4a7e524f61f",
          "dcat:accessService": [
            {
              "@type": "dcat:DataService",
              "@id": "urn:uuid:96645550-840f-44a0-a994-427cdfd0b2d8",
              "dcat:endpointURL": "http://localhost"
            }
          ],
          "dct:conformsTo": ["https://httpbin.org/spec.json"],
          "dct:format": "tsg:analytics",
          "dct:title": "HTTPBin"
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
        async ({ request, params, cookies }) => {
          const requestBody = await request.json();
          return HttpResponse.json({
            ...requestBody,
            identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9"
          });
        }
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/catalog`,
        ({ request, params, cookies }) => {
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
            "@context": "https://w3id.org/dspace/2024/1/context.json",
            "@type": "odrl:Agreement",
            "@id": "urn:uuid:test",
            "odrl:assigner": "did:web:localhost",
            "odrl:assignee": "did:web:localhost",
            "dspace:timestamp": new Date().toISOString(),
            "odrl:target": "urn:uuid:dataset"
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
            "@context": "https://w3id.org/dspace/2024/1/context.json",
            "@type": "dcat:Dataset",
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
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
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

  describe("Provider process", () => {
    let transferProcessId = "urn:uuid:4904fd10-05c0-40fe-99f8-ce4a7d336c4f";
    let authorization = "";

    const request = {
      method: "POST",
      path: "/0.9.2/anything/test",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      query: {
        filter: "filterQueryString"
      } as qs.ParsedQs,
      body: {
        test: "test2"
      },
      rawBody: Buffer.from(JSON.stringify({ test: "test2" }), "utf-8")
    } as RawBodyRequest<Request>;

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
          "@type": "dspace:TransferRequestMessage",
          "dspace:agreementId": "urn:uuid:cadb401e-4275-4d77-99a2-5aa2af93e3b7",
          "dct:format": "dspace:HTTP",
          "dspace:callbackAddress": "http://127.0.0.1/test",
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        "provider",
        transferProcessId,
        "did:web:localhost",
        "urn:uuid:test"
      );
      transferProcessId = result.identifier;
      authorization =
        result.dataAddress?.properties?.find(
          ({ name }) => name === "Authorization"
        )?.value || "UNKNOWN";
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
          "@type": "dspace:TransferStartMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Transfer completion", async () => {
      await dataPlaneService.handleTransferComplete(
        {
          "@type": "dspace:TransferCompletionMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
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
    const request = {
      method: "POST",
      path: "/anything/test",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      query: {
        filter: "filterQueryString"
      } as qs.ParsedQs,
      body: {
        test: "test2"
      },
      rawBody: Buffer.from(JSON.stringify({ test: "test2" }), "utf-8")
    } as RawBodyRequest<Request>;

    it("Transfer Request", async () => {
      const result = await dataPlaneService.handleTransferRequest(
        {
          "@type": "dspace:TransferRequestMessage",
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
          "dspace:agreementId": "urn:uuid:e785d4a8-2030-4a2b-b223-9881e35c0df7",
          "dct:format": "dspace:HTTP",
          "dspace:callbackAddress": "http://127.0.0.1/test"
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
          "@type": "dspace:TransferStartMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
          "dspace:dataAddress": {
            "@type": "dspace:DataAddress",
            "dspace:endpoint": "https://httpbin.org/anything",
            "dspace:endpointType": "dspace:HTTP",
            "dspace:endpointProperties": [
              {
                "@type": "dspace:EndpointProperty",
                "dspace:name": "Authorization",
                "dspace:value": "Bearer ABCDEF"
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
          "@type": "dspace:TransferCompletionMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
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
  let managementToken: string;

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
        async ({ request, params, cookies }) => {
          const requestBody = await request.json();
          managementToken = requestBody.managementToken;
          return HttpResponse.json({
            ...requestBody,
            identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9"
          });
        }
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/catalog`,
        ({ request, params, cookies }) => {
          return HttpResponse.json(request.json());
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          DataPlaneStateDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
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
      expect(await dataPlaneService.getDatasets()).toHaveLength(0);
      await dataPlaneService.updateDatasets([
        {
          "@context": "https://w3id.org/dspace/2024/1/context.json",
          "@type": "dcat:Dataset",
          "@id": "urn:uuid:test"
        }
      ]);
      const config = await dataPlaneService.getDatasets();
      expect(config).toHaveLength(1);
    });
  });
});
