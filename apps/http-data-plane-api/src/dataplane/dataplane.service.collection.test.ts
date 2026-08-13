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
  DataPlaneRegistrationService,
  DataPlaneStateDao
} from "@tsg-dsp/common-data-plane-api";
import { createDataPlaneHttpMocks } from "@tsg-dsp/common-data-plane-api/testing";
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

describe("Dataplane with CollectionDatasetConfig", () => {
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
        type: "collection"
      },
      initCollection: [
        {
          id: "urn:aasx:TestShell1",
          title: "Test Shell 1",
          version: "v1",
          backendUrl: "https://httpbin.org/anything/shells/urn:aasx:TestShell1",
          openApiSpecRef:
            "https://app.swaggerhub.com/apiproxy/registry/BaSyx/basyx_asset_administration_shell_repository_http_rest_api/v1"
        },
        {
          id: "urn:aasx:TestShell2",
          title: "Test Shell 2",
          version: "v1",
          backendUrl: "https://httpbin.org/anything/shells/urn:aasx:TestShell2",
          openApiSpecRef:
            "https://app.swaggerhub.com/apiproxy/registry/BaSyx/basyx_asset_administration_shell_repository_http_rest_api/v1"
        }
      ],
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
    await dataPlaneService.initialized;
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Dataset item interactions", () => {
    it("Initial state", async () => {
      const config = dataPlaneService.getDatasetConfig();
      expect(config).toBeDefined();
      expect(config.type).toEqual("collection");

      await expect(dataPlaneService.getDatasets()).resolves.toHaveLength(2);
    });
    it("Add dataset", async () => {
      await dataPlaneService.addDatasetItem({
        id: "urn:aasx:TestShell3",
        title: "Test Shell 3",
        version: "v1",
        backendUrl: "https://httpbin.org/anything/shells/urn:aasx:TestShell3",
        openApiSpecRef:
          "https://app.swaggerhub.com/apiproxy/registry/BaSyx/basyx_asset_administration_shell_repository_http_rest_api/v1",
        authorization: null,
        mediaType: null,
        schemaRef: null,
        policy: null,
        extraProps: null
      });

      await expect(dataPlaneService.getDatasets()).resolves.toHaveLength(3);
    });
    it("Add dataset with GeoDCAT-AP extraProps", async () => {
      await dataPlaneService.addDatasetItem({
        id: "urn:geodcat:SpatialDataset1",
        title: "Spatial Infrastructure Dataset",
        version: "v1",
        backendUrl: "https://example.org/api/geo/infrastructure",
        openApiSpecRef: null,
        authorization: null,
        mediaType: "application/geo+json",
        schemaRef: null,
        policy: null,
        extraProps: {
          "dct:spatial": {
            "@type": "dct:Location",
            "dcat:bbox":
              "POLYGON((4.31 51.87, 4.31 52.03, 4.80 52.03, 4.80 51.87, 4.31 51.87))"
          },
          "dcat:spatialResolutionInMeters": 10.0,
          "dcat:temporalResolution": "P1D"
        }
      });
      const datasets = await dataPlaneService.getDatasets();
      const geoDataset: any | undefined = datasets.find(
        (d) => d["@id"] === "urn:geodcat:SpatialDataset1"
      );
      expect(geoDataset).toBeDefined();

      expect(geoDataset!["dct:spatial"]).toBeDefined();
      expect(geoDataset!["dcat:spatialResolutionInMeters"]).toEqual(10.0);
      expect(geoDataset!["dcat:temporalResolution"]).toEqual("P1D");
    });
    it("Reject dataset with unknown prefix in extraProps", async () => {
      await expect(
        dataPlaneService.addDatasetItem({
          id: "urn:invalid:UnknownPrefix1",
          title: "Invalid Dataset",
          version: "v1",
          backendUrl: "https://example.org/api/invalid",
          openApiSpecRef: null,
          authorization: null,
          mediaType: null,
          schemaRef: null,
          policy: null,
          extraProps: {
            "unknownprefix:property": "value"
          }
        })
      ).rejects.toThrow("Dataset has extraProps with unknown prefixes");
    });
    it("Add dataset with HealthDCAT-AP extraProps", async () => {
      await dataPlaneService.addDatasetItem({
        id: "urn:healthdcat:ClinicalTrialData1",
        title: "Clinical Trial Results",
        version: "v1",
        backendUrl: "https://example.org/api/health/clinical-trials",
        openApiSpecRef: null,
        authorization: null,
        mediaType: "application/json",
        schemaRef: null,
        policy: null,
        extraProps: {
          "healthdcatap:hasCodeValues": "ICD-10",
          "healthdcatap:numberOfRecords": 15000,
          "healthdcatap:minTypicalAge": 18,
          "healthdcatap:maxTypicalAge": 75,
          "healthdcatap:populationCoverage": "National",
          "dct:spatial": "Netherlands"
        }
      });
      const datasets = await dataPlaneService.getDatasets();
      const healthDataset: any | undefined = datasets.find(
        (d) => d["@id"] === "urn:healthdcat:ClinicalTrialData1"
      );
      expect(healthDataset).toBeDefined();
      expect(healthDataset!["healthdcatap:numberOfRecords"]).toEqual(15000);
      expect(healthDataset!["healthdcatap:minTypicalAge"]).toEqual(18);
      expect(healthDataset!["healthdcatap:maxTypicalAge"]).toEqual(75);
      expect(healthDataset!["healthdcatap:populationCoverage"]).toEqual(
        "National"
      );
    });
    it("Update dataset with extraProps", async () => {
      await dataPlaneService.updateDatasetItem(
        "urn:healthdcat:ClinicalTrialData1",
        {
          id: "urn:healthdcat:ClinicalTrialData1",
          title: "Clinical Trial Results",
          version: "v2",
          backendUrl: "https://example.org/api/health/clinical-trials",
          openApiSpecRef: null,
          authorization: null,
          mediaType: "application/json",
          schemaRef: null,
          policy: null,
          extraProps: {
            "healthdcatap:numberOfRecords": 22000,
            "healthdcatap:minTypicalAge": 18,
            "healthdcatap:maxTypicalAge": 80
          }
        }
      );
      const datasets = await dataPlaneService.getDatasets();
      const updated: any | undefined = datasets.find(
        (d) => d["@id"] === "urn:healthdcat:ClinicalTrialData1"
      );
      expect(updated).toBeDefined();
      expect(updated!["healthdcatap:numberOfRecords"]).toEqual(22000);
      expect(updated!["healthdcatap:maxTypicalAge"]).toEqual(80);
      // populationCoverage should no longer be present after update
      expect(updated!["healthdcatap:populationCoverage"]).toBeUndefined();
    });
    it("Update dataset", async () => {
      await dataPlaneService.updateDatasetItem("urn:aasx:TestShell3", {
        id: "urn:aasx:TestShell3",
        title: "Test Shell 3",
        version: "v2",
        backendUrl: "https://httpbin.org/anything/shells/urn:aasx:TestShell3",
        openApiSpecRef:
          "https://app.swaggerhub.com/apiproxy/registry/BaSyx/basyx_asset_administration_shell_repository_http_rest_api/v2",
        authorization: null,
        mediaType: null,
        schemaRef: null,
        policy: null,
        extraProps: null
      });
      const datasets = await dataPlaneService.getDatasets();
      expect(datasets).toHaveLength(5);
      expect(datasets[2].version).toEqual("v2");

      await expect(
        dataPlaneService.updateDatasetItem("urn:aasx:TestShell4", {
          id: "urn:aasx:TestShell4",
          title: "Test Shell 4",
          version: "v1",
          backendUrl: "https://httpbin.org/anything/shells/urn:aasx:TestShell4",
          openApiSpecRef:
            "https://app.swaggerhub.com/apiproxy/registry/BaSyx/basyx_asset_administration_shell_repository_http_rest_api/v1",
          authorization: null,
          mediaType: null,
          schemaRef: null,
          policy: null,
          extraProps: null
        })
      ).rejects.toThrow("not found");
    });
    it("Remove dataset", async () => {
      await dataPlaneService.removeDatasetItem("urn:aasx:TestShell3");
      await dataPlaneService.removeDatasetItem("urn:geodcat:SpatialDataset1");
      await dataPlaneService.removeDatasetItem(
        "urn:healthdcat:ClinicalTrialData1"
      );

      await expect(dataPlaneService.getDatasets()).resolves.toHaveLength(2);

      await expect(
        dataPlaneService.removeDatasetItem("urn:aasx:TestShell3")
      ).rejects.toThrow("not found");
    });
  });
});
