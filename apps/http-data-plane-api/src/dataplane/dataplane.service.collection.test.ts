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
  DataPlaneRegistrationService,
  DataPlaneStateDao
} from "@tsg-dsp/common-data-plane-api";
import { plainToClass } from "class-transformer";
import { SetupServer, setupServer } from "msw/node";

import { LoggingConfig, RootConfig } from "../config.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
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
        policy: null
      });

      await expect(dataPlaneService.getDatasets()).resolves.toHaveLength(3);
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
        policy: null
      });
      const datasets = await dataPlaneService.getDatasets();
      expect(datasets).toHaveLength(3);
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
          policy: null
        })
      ).rejects.toThrow("not found");
    });
    it("Remove dataset", async () => {
      await dataPlaneService.removeDatasetItem("urn:aasx:TestShell3");

      await expect(dataPlaneService.getDatasets()).resolves.toHaveLength(2);

      await expect(
        dataPlaneService.removeDatasetItem("urn:aasx:TestShell3")
      ).rejects.toThrow("not found");
    });
  });
});
