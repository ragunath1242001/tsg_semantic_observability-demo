import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper,
  validateOrRejectSync
} from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ControlPlaneConfig,
  DataPlaneRegistrationService,
  DataPlaneStateDao
} from "@tsg-dsp/common-data-plane-api";
import {
  createDataPlaneHttpMocks,
  createDataPlaneManagementHttpMocks,
  createDidConnectorHttpMocks
} from "@tsg-dsp/common-data-plane-api/testing";
import { DatasetDto, defaultContext, OfferDto } from "@tsg-dsp/common-dsp";
import {
  DatasetConfig,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";
import { plainToClass } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { vi } from "vitest";

import { LoggingConfig, RootConfig } from "../config.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
import { DatasetConfigObserverService } from "../semantic-observability/dataset-config-observer.service.js";
import { TransferDao } from "../transfer/transfer.dao.js";
import { DataPlaneController } from "./dataplane.controller.js";
import {
  DatasetItemDao,
  HttpDatasetConfigDao,
  VersionedDatasetDao
} from "./dataplane.dao.js";
import { DataPlaneService } from "./dataplane.service.js";

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
      ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint),
      ...createDataPlaneManagementHttpMocks(
        config.controlPlane.managementEndpoint
      ),
      ...createDidConnectorHttpMocks(),
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
      })
    );

    server.listen({ onUnhandledRequest: "error" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          HttpDatasetConfigDao,
          VersionedDatasetDao,
          DatasetItemDao,
          IngressLogDao,
          EgressLogDao,
          DataPlaneStateDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          HttpDatasetConfigDao,
          VersionedDatasetDao,
          DatasetItemDao,
          IngressLogDao,
          EgressLogDao,
          DataPlaneStateDao
        ])
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        LoggingService,
        AuthClientService,
        DataPlaneRegistrationService,
        CatalogClientService,
        {
          provide: DatasetConfigObserverService,
          useValue: {
            recordDatasetConfigObserved: vi.fn(),
            recordDatasetItemObserved: vi.fn(),
            recordMetadataValidationResult: vi.fn()
          }
        },
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
        },
        {
          provide: ControlPlaneConfig,
          useValue: config.controlPlane
        }
      ]
    }).compile();
    await moduleRef.init();

    dataPlaneService = moduleRef.get(DataPlaneService);
    await expect(dataPlaneService.getStateDto()).rejects.toThrow(
      "Data plane state not found"
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Config management", () => {
    it("Get state", async () => {
      await dataPlaneService.initialized;
      const state = await dataPlaneService.getStateDto();
      expect(state.id).toBeDefined();
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
                  action: "use",
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
    it("Update config with GeoDCAT-AP extraProps", async () => {
      await dataPlaneService.updateDatasetConfig(
        DatasetConfig.parse(
          {
            type: "versioned",
            id: `urn:uuid:test-geo`,
            title: "Geospatial Infrastructure",
            baseSemanticModelRef: "https://semiceu.github.io/GeoDCAT-AP/",
            currentVersion: "1.0.0",
            extraProps: {
              "dct:spatial": {
                "@type": "dct:Location",
                "http://www.w3.org/ns/locn#geometry": {
                  "@type": "http://www.opengis.net/ont/geosparql#wktLiteral",
                  "@value":
                    "POLYGON((4.31 51.87, 4.31 52.03, 4.80 52.03, 4.80 51.87, 4.31 51.87))"
                }
              },
              "dcat:spatialResolutionInMeters": 10.0,
              "dcat:temporalResolution": "P1D"
            },
            versions: [
              {
                version: "1.0.0",
                distributions: [
                  {
                    mediaType: "application/geo+json",
                    backendUrl: "https://example.org/geo/api"
                  }
                ]
              }
            ]
          },
          validateOrRejectSync
        )
      );
      const datasets = await dataPlaneService.getDatasets();
      const baseDataset = datasets.find(
        (d) => d["@id"] === "urn:uuid:test-geo"
      ) as (DatasetDto & Record<string, unknown>) | undefined;
      expect(baseDataset).toBeDefined();
      expect(baseDataset!["dct:spatial"]).toBeDefined();
      expect(baseDataset!["dcat:spatialResolutionInMeters"]).toEqual(10.0);
      expect(baseDataset!["dcat:temporalResolution"]).toEqual("P1D");
    });
    it("Update config with HealthDCAT-AP extraProps", async () => {
      await dataPlaneService.updateDatasetConfig(
        DatasetConfig.parse(
          {
            type: "versioned",
            id: `urn:uuid:test-health`,
            title: "Clinical Trial Registry",
            baseSemanticModelRef:
              "https://healthdataeu.pages.code.europa.eu/healthdcat-ap/",
            currentVersion: "2.0.0",
            extraProps: {
              "healthdcatap:hasCodeValues": {
                "@type": "http://www.w3.org/2004/02/skos/core#ConceptScheme",
                "http://www.w3.org/2004/02/skos/core#prefLabel": "ICD-10"
              },
              "healthdcatap:numberOfRecords": 50000,
              "healthdcatap:minTypicalAge": 18,
              "healthdcatap:maxTypicalAge": 90,
              "healthdcatap:populationCoverage": "National"
            },
            versions: [
              {
                version: "2.0.0",
                distributions: [
                  {
                    mediaType: "application/json",
                    backendUrl: "https://example.org/health/trials"
                  }
                ]
              }
            ]
          },
          validateOrRejectSync
        )
      );
      const datasets = await dataPlaneService.getDatasets();
      const baseDataset = datasets.find(
        (d) => d["@id"] === "urn:uuid:test-health"
      ) as (DatasetDto & Record<string, unknown>) | undefined;
      expect(baseDataset).toBeDefined();
      expect(baseDataset!["healthdcatap:numberOfRecords"]).toEqual(50000);
      expect(baseDataset!["healthdcatap:minTypicalAge"]).toEqual(18);
      expect(baseDataset!["healthdcatap:maxTypicalAge"]).toEqual(90);
      expect(baseDataset!["healthdcatap:populationCoverage"]).toEqual(
        "National"
      );
      expect(baseDataset!["healthdcatap:hasCodeValues"]).toBeDefined();
    });
    it("Reject config with unknown prefix in extraProps", async () => {
      await expect(
        dataPlaneService.updateDatasetConfig(
          DatasetConfig.parse(
            {
              type: "versioned",
              id: `urn:uuid:test-invalid`,
              title: "Invalid prefix",
              currentVersion: "1.0.0",
              extraProps: {
                "unknownprefix:property": "value"
              },
              versions: [
                {
                  version: "1.0.0",
                  distributions: [
                    {
                      backendUrl: "https://example.org/api"
                    }
                  ]
                }
              ]
            },
            validateOrRejectSync
          )
        )
      ).rejects.toThrow(
        "Unresolvable keys in extraProps: unknownprefix:property"
      );
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
                "@context": defaultContext(),
                "@type": "Offer",
                "@id": "urn:uuid:65d23eb8-6536-42ff-b292-78ab2a991f66",
                assigner: "did:web:...",
                permission: [
                  {
                    "@type": "Permission",
                    action: "use",
                    target: "urn:uuid:test"
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
