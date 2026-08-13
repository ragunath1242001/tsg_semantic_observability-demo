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
import { createDataPlaneHttpMocks } from "@tsg-dsp/common-data-plane-api/testing";
import { DatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { plainToClass } from "class-transformer";
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
      ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint)
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
            recordMetadataValidationResult: vi.fn(),
            recordValidatedFieldUsage: vi.fn()
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

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Initial state", () => {
    it("Add dataset config", async () => {
      await dataPlaneService.initialized;
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
