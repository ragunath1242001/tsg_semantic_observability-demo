import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneController } from "./dataplane.controller";
import { AuthConfig, InitCatalog, ServerConfig } from "../config";
import { plainToClass } from "class-transformer";
import { DataPlaneService } from "./dataPlane.service";
import { CatalogService } from "../dsp/catalog/catalog.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneDao } from "../model/dataPlanes.dao";
import {
  CatalogDao,
  CatalogRecordDao,
  DatasetDao,
  DataServiceDao,
  DistributionDao,
  ResourceDao,
} from "../model/catalog.dao";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { AuthClientService } from "../auth/auth.client.service";
import { Agreement } from "@tsg-dsp/common-dsp";
import { NegotiationService } from "../dsp/negotiation/negotiation.service";

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
          DataPlaneDao,
        ]),
        TypeOrmModule.forFeature([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneDao,
        ]),
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        CatalogService,
        AuthClientService,
        {
          provide: NegotiationService,
          useValue: {
            async getAgreement(agreementId: string): Promise<Agreement> {
              return new Agreement({
                assignee: "did:web:localhost",
                assigner: "did:web:localhost",
                target: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                timestamp: new Date().toISOString(),
              });
            },
          },
        },
        {
          provide: InitCatalog,
          useValue: initCatalog,
        },
        {
          provide: ServerConfig,
          useValue: serverConfig,
        },
        {
          provide: AuthConfig,
          useValue: authConfig,
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
        role: "consumer",
      });
      expect(result.identifier).toContain("urn:uuid:");
    });
  });
});
