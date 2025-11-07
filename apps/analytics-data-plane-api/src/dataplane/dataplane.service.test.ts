import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AppLogger,
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
  DataPlaneRegistrationService,
  DataPlaneStateDao
} from "@tsg-dsp/common-data-plane-api";
import { DatasetDto, defaultContext } from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { SetupServer, setupServer } from "msw/node";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { RootConfig } from "../config.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataplane.service.js";
import { DatasetDao } from "./dataset.dao.js";
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
      ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint),
      ...createDataPlaneManagementHttpMocks(
        config.controlPlane.managementEndpoint
      ),
      ...createDidConnectorHttpMocks()
    );

    server.listen({ onUnhandledRequest: "error" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao,
          DatasetDao,
          DataPlaneStateDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao,
          DatasetDao,
          DataPlaneStateDao
        ])
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        AuthClientService,
        DataPlaneRegistrationService,
        CatalogClientService,
        {
          provide: AuthConfig,
          useValue: { enabled: false }
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
    })
      .setLogger(new AppLogger())
      .compile();
    await moduleRef.init();

    dataPlaneService = moduleRef.get(DataPlaneService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Config management", () => {
    const testDataset: DatasetDto = {
      "@context": defaultContext(),
      "@type": "Dataset",
      "@id": "urn:uuid:test-2",
      title: "CSV Test File",
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
          "@id": "urn:uuid:d5aa3eca-fa52-4987-9040-29c320e08f70",
          byteSize: "1000",
          mediaType: "text/csv",
          description: ["Data file test.csv"],
          format: "tsg:analytics",
          issued: "2025-08-01T00:00:00.000Z",
          title: "test.csv"
        }
      ]
    };

    it("Initialize data plane", async () => {
      await expect(dataPlaneService.getStateDto()).rejects.toThrow(
        "Data plane state not found - may not be registered yet"
      );

      await dataPlaneService.initialized;
      await new Promise((r) => setTimeout(r, 50));
    });
    it("Add dataset", async () => {
      expect(await dataPlaneService.getDatasets()).toHaveLength(1);
      await dataPlaneService.addDataset(testDataset);
      expect(await dataPlaneService.getDatasets()).toHaveLength(2);
      const fetchedDataset = await dataPlaneService.getDataset(
        testDataset["@id"]
      );
      expect(fetchedDataset).toEqual(testDataset);

      await expect(dataPlaneService.getDataset("unknown")).rejects.toThrow(
        "not found"
      );
    });
    it("Update dataset", async () => {
      await dataPlaneService.updateDataset(testDataset["@id"], {
        ...testDataset,
        title: "Updated CSV Test File"
      });
      expect(await dataPlaneService.getDatasets()).toHaveLength(2);
    });
    it("Delete dataset", async () => {
      await dataPlaneService.deleteDataset(testDataset["@id"]);
      await expect(
        dataPlaneService.getDataset(testDataset["@id"])
      ).rejects.toThrow("not found");

      expect(await dataPlaneService.getDatasets()).toHaveLength(1);
    });
  });
});
