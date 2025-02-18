import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneService } from "./dataplane.service.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { plainToClass } from "class-transformer";
import { LoggingConfig, RootConfig } from "../config.js";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import {
  AgreementDto,
  DataPlaneCreation,
  DatasetDto,
  OfferDto
} from "@tsg-dsp/common-dsp";
import { TransferDao } from "../transfer/transfer.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao, DatasetItemDao } from "./dataplane.dao.js";
import { HttpStatus } from "@nestjs/common";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
import {
  TypeOrmTestHelper,
  AuthClientService,
  AuthConfig,
  validateOrRejectSync
} from "@tsg-dsp/common-api";
import {
  DatasetConfig,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";

describe("Dataplane Service", () => {
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
      dataset: {
        type: "versioned",
        id: `urn:uuid:test`,
        title: "HTTPBin",
        versions: [
          {
            version: "0.9.2",
            authorization: "Bearer AAAAAAA",
            distributions: [
              {
                mediaType: "http/json",
                backendUrl: "https://httpbin.org/anything" // This URL returns anything that is passed in the request data.
              } //  The testcases expect this, so keep this url as backend.
            ]
          }
        ]
      },
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
      }),
      http.post("http://your-api-url/negotiations/request", ({ request }) => {
        if (request.url.includes("validDatasetId")) {
          return HttpResponse.json(HttpStatus.OK); // successful response
        } else {
          return HttpResponse.json(HttpStatus.NOT_FOUND); // simulate failure for invalid datasets
        }
      }),
      http.get("https://testaudience/.well-known/did.json", () => {
        return HttpResponse.json({
          service: [
            {
              type: "connector",
              serviceEndpoint: "http://remotecontrolplane/"
            }
          ]
        });
      }),
      http.post("http://localhost:3000/management/negotiations/request", () => {
        return HttpResponse.json({
          "@type": "dspace:ContractNegotiation",
          "@id": "urn:uuid:1234",
          "dspace:providerPid": "providerPid",
          "dspace:consumerPid": "consumerPid",
          "dspace:state": "dspace:REQUESTED"
        });
      }),
      http.get("http://localhost:3000/management/request", () => {
        return HttpResponse.json({});
      }),
      http.get("http://localhost:3000/management/catalog/request", () => {
        return HttpResponse.text("", { status: 400 });
      })
    );

    server.listen({ onUnhandledRequest: "warn" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          DataPlaneStateDao,
          DatasetItemDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          DataPlaneStateDao,
          DatasetItemDao,
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
    await dataPlaneService.initialized;
    await new Promise((r) => setTimeout(r, 20));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Config management", () => {
    it("Get state", async () => {
      await dataPlaneService.initialized;
      await new Promise((r) => setTimeout(r, 100));
      const state = await dataPlaneService.getStateDto();
      expect(state.dataset?.length).toBeGreaterThanOrEqual(1);
      expect(state.identifier).toBeDefined();
      expect(state.details).toBeDefined();
    });
    it("Update config", async () => {
      await dataPlaneService.updateDatasetConfig(
        DatasetConfig.parse(
          {
            type: "versioned",
            id: `urn:uuid:test`,
            title: "HTTPBin",
            baseSemanticModelRef: "https://some-ontology.org",
            currentVersion: "0.9.2",
            versions: [
              {
                version: "0.9.2",
                semanticModelRef: "http://example.org/semantics",
                authorization: "Bearer AAAAAAA",
                distributions: [
                  {
                    mediaType: "application/json",
                    backendUrl: "http://example.org/http"
                  }
                ]
              },
              {
                version: "0.9.1",
                authorization: "Bearer AAAAAAA",
                distributions: [
                  {
                    // mediaType: "application/json",
                    backendUrl: "http://example.org/http"
                  }
                ]
              }
            ],
            policy: {
              type: "rules",
              permissions: [
                {
                  action: "odrl:use",
                  constraints: [
                    {
                      type: "CredentialType",
                      value: "dataspace:MembershipCredential"
                    }
                  ]
                },
                {
                  action: "odrl:read"
                }
              ],
              prohibitions: [
                {
                  action: "odrl:distribute"
                },
                {
                  action: "odrl:sell",
                  constraints: [
                    {
                      type: "CredentialType",
                      value: "dataspace:CommercialCredential"
                    }
                  ]
                }
              ]
            }
          },
          validateOrRejectSync
        )
      );
      const config: VersionedDatasetConfig =
        dataPlaneService.getDatasetConfig() as VersionedDatasetConfig;
      expect(config.versions).toHaveLength(2);
      expect(config.baseSemanticModelRef).toEqual("https://some-ontology.org");
      expect(config.policy).toBeDefined();
    });
    it("Default policy", async () => {
      await dataPlaneService.updateDatasetConfig(
        DatasetConfig.parse(
          {
            type: "versioned",
            id: `urn:uuid:test`,
            title: "HTTPBin",
            currentVersion: "0.9.2",
            versions: [
              {
                version: "0.9.2",
                authorization: "Bearer AAAAAAA",
                semanticModelRef: "http://some-more-specific-ontology.org",
                distributions: [
                  {
                    mediaType: "application/json",
                    openApiSpecRef: "https://httpbin.org/spec.json",
                    backendUrl: "https://httpbin.org/anything"
                  }
                ]
              }
            ],
            policy: {
              type: "default"
            }
          },
          validateOrRejectSync
        )
      );
    });
    it("Raw policy", async () => {
      await dataPlaneService.updateDatasetConfig(
        DatasetConfig.parse(
          {
            type: "versioned",
            id: `urn:uuid:test`,
            title: "HTTPBin",
            currentVersion: "0.9.2",
            versions: [
              {
                version: "0.9.2",
                authorization: "Bearer AAAAAAA",
                semanticModelRef: "http://some-more-specific-ontology.org",
                distributions: [
                  {
                    mediaType: "application/json",
                    openApiSpecRef: "https://httpbin.org/spec.json",
                    backendUrl: "https://httpbin.org/anything"
                  }
                ]
              }
            ],
            policy: {
              type: "manual",
              raw: {
                "@context": "https://w3id.org/dspace/2024/1/context.json",
                "@type": "odrl:Offer",
                "@id": "urn:uuid:65d23eb8-6536-42ff-b292-78ab2a991f66",
                "odrl:assigner": "did:web:...",
                "odrl:permission": [
                  {
                    "@type": "odrl:Permission",
                    "odrl:action": "odrl:use",
                    "odrl:target": "urn:uuid:test"
                  }
                ]
              }
            }
          },
          validateOrRejectSync
        )
      );
    });
    it("Empty raw policy", async () => {
      await expect(
        dataPlaneService.updateDatasetConfig(
          DatasetConfig.parse(
            {
              type: "versioned",
              id: `urn:uuid:test`,
              title: "HTTPBin",
              currentVersion: "0.9.2",
              versions: [
                {
                  version: "0.9.2",
                  authorization: "Bearer AAAAAAA",
                  semanticModelRef: "http://some-more-specific-ontology.org",
                  distributions: [
                    {
                      mediaType: "application/json",
                      openApiSpecRef: "https://httpbin.org/spec.json",
                      backendUrl: "https://httpbin.org/anything"
                    }
                  ]
                }
              ],
              policy: {
                type: "manual"
              }
            },
            validateOrRejectSync
          )
        )
      ).rejects.toThrow("must be provided for policy");
    });
    it("Erroneous raw policy", async () => {
      await expect(
        dataPlaneService.updateDatasetConfig(
          DatasetConfig.parse({
            type: "versioned",
            id: `urn:uuid:test`,
            title: "HTTPBin",
            currentVersion: "0.9.2",
            versions: [
              {
                version: "0.9.2",
                authorization: "Bearer AAAAAAA",
                semanticModelRef: "http://some-more-specific-ontology.org",
                distributions: [
                  {
                    mediaType: "application/json",
                    openApiSpecRef: "https://httpbin.org/spec.json",
                    backendUrl: "https://httpbin.org/anything"
                  }
                ]
              }
            ],
            policy: {
              type: "manual",
              raw: "Test" as unknown as OfferDto
            }
          })
        )
      ).rejects.toThrow("Could not deserialize");
    });
  });
});

describe("Starting without initial dataset configuration", () => {
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
          DataPlaneStateDao,
          DatasetItemDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          DataPlaneStateDao,
          DatasetItemDao,
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

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Initial state", () => {
    it("Add dataset config", async () => {
      await dataPlaneService.initialized;
      await new Promise((r) => setTimeout(r, 1000));
      expect(() => dataPlaneService.getDatasetConfig()).toThrow(
        "No dataset configured"
      );
      await dataPlaneService.updateDatasetConfig(
        DatasetConfig.parse(
          {
            type: "versioned",
            id: `urn:uuid:test`,
            title: "HTTPBin",
            currentVersion: "0.9.2",
            versions: [
              {
                version: "0.9.2",
                authorization: "Bearer AAAAAAA",
                semanticModelRef: "http://some-more-specific-ontology.org",
                distributions: [
                  {
                    mediaType: "application/json",
                    openApiSpecRef: "https://httpbin.org/spec.json",
                    backendUrl: "https://httpbin.org/anything"
                  }
                ]
              }
            ]
          },
          validateOrRejectSync
        )
      );
      expect(dataPlaneService.getDatasetConfig()).toBeDefined();
    });
  });
});
