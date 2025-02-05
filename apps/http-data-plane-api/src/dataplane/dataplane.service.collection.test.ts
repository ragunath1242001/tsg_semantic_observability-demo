import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneService } from "./dataplane.service.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { plainToClass } from "class-transformer";
import { LoggingConfig, RootConfig } from "../config.js";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import { DataPlaneCreation } from "@tsg-dsp/common-dsp";
import { TransferDao } from "../transfer/transfer.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao, DatasetItemDao } from "./dataplane.dao.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
import {
  TypeOrmTestHelper,
  AuthClientService,
  AuthConfig
} from "@tsg-dsp/common-api";

describe("Dataplane with CollectionDatasetConfig", () => {
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
        async ({ request, params, cookies }) => {
          return HttpResponse.json(await request.json());
        }
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/dataset`,
        async ({ request, params, cookies }) => {
          return HttpResponse.text();
        }
      ),
      http.put(
        `${config.controlPlane.dataPlaneEndpoint}/:id/dataset/:datasetId`,
        async ({ request, params, cookies }) => {
          return HttpResponse.text();
        }
      ),
      http.delete(
        `${config.controlPlane.dataPlaneEndpoint}/:id/dataset/:datasetId`,
        async ({ request, params, cookies }) => {
          return HttpResponse.text();
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
    await dataPlaneService.initialized;
    let i = 0;
    while (dataPlaneService["state"] === undefined && i < 100) {
      await new Promise((r) => setTimeout(r, 50));
      i++;
    }
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
      expect(datasets[2]["dcat:version"]).toEqual("v2");

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
