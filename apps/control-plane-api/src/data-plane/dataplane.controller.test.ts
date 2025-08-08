import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { AgreementDto } from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";

import { InitCatalog } from "../config.js";
import { CatalogService } from "../dsp/catalog/catalog.service.js";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../model/catalog.dao.js";
import { DataPlaneDao } from "../model/dataPlanes.dao.js";
import { AgreementService } from "../policy/agreement.service.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneService } from "./dataPlane.service.js";

describe("DataPlaneController", () => {
  let dataPlaneController: DataPlaneController;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initCatalog = plainToClass(InitCatalog, {});
    const serverConfig = plainToClass(ServerConfig, {});
    const authConfig = plainToClass(AuthConfig, { enabled: false });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneDao
        ]),
        TypeOrmModule.forFeature([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneDao
        ])
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        CatalogService,
        AuthClientService,
        {
          provide: AgreementService,
          useValue: {
            async getAgreement(): Promise<AgreementDto> {
              return {
                "@type": "Agreement",
                "@id": "urn:uuid:24bcf50a-fb1b-4820-bbad-e015c6b8ab39",
                assigner: "did:web:localhost",
                assignee: "did:web:localhost",
                target: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                timestamp: new Date().toISOString()
              };
            }
          }
        },
        {
          provide: InitCatalog,
          useValue: initCatalog
        },
        {
          provide: ServerConfig,
          useValue: serverConfig
        },
        {
          provide: AuthConfig,
          useValue: authConfig
        }
      ]
    }).compile();

    dataPlaneController = moduleRef.get(DataPlaneController);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("/init", () => {
    it("Initialization of a new data plane should return 200", async () => {
      const result = await dataPlaneController.init({
        dataplaneType: "http",
        endpointPrefix: "/api",
        callbackAddress: "http://localhost/api/callback",
        managementAddress: "http://localhost/api/management",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      });
      expect(result.identifier).toContain("urn:uuid:");
    });
  });
});
