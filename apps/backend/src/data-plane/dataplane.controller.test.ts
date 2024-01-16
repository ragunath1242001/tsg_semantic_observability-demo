import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneController } from "./dataplane.controller";
import { InitCatalog, ServerConfig } from "../config";
import { plainToClass } from "class-transformer";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogService } from "../dsp/catalog/catalog.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DataPlaneStatusDao,
  DataPlaneDetailsDao,
} from "../model/data-planes/dataPlanes.dao";
import {
  CatalogDao,
  CatalogRecordDao,
  DatasetDao,
  DataServiceDao,
  DistributionDao,
  ResourceDao,
} from "../model/dsp/catalog/catalog.dao";
import { TypeOrmTestHelper } from "../utils/testhelper";

describe("DataPlaneController", () => {
  let dataPlaneController: DataPlaneController;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initCatalog = plainToClass(InitCatalog, {});
    const serverConfig = plainToClass(ServerConfig, {});

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneStatusDao,
          DataPlaneDetailsDao,
        ]),
        TypeOrmModule.forFeature([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneStatusDao,
          DataPlaneDetailsDao,
        ]),
      ],
      controllers: [
        DataPlaneController
      ],
      providers: [
        DataPlaneService,
        CatalogService,
        {
          provide: InitCatalog,
          useValue: initCatalog,
        },
        {
          provide: ServerConfig,
          useValue: serverConfig,
        },
      ],
    }).compile();

    dataPlaneController = moduleRef.get(DataPlaneController);
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("/init", () => {
    it("Initialization of a new data plane should return 200", async () => {
      const result = await dataPlaneController.init({
          dataplaneType: "http",
          endpointPrefix: "https://",
          callbackAddress: "https://httpbin.org/anything",
          managementAddress: "https://httpbin.org/mgmt",
          managementToken: "",
          catalogSynchronization: "pull",
          role: "consumer"
      });
      expect(result.identifier).toContain('urn:uuid:')
    });
  });
});
