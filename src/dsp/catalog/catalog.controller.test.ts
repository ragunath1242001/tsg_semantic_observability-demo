import { Test, TestingModule } from "@nestjs/testing";
import { CatalogController } from "./catalog.controller";
import { CatalogRequestMessage, DatasetRequestMessage } from "../../model/dsp/catalog/messages";
import { CatalogService } from "./catalog.service";
import { HttpStatus, INestApplication } from "@nestjs/common";
import request from "supertest";
import { Catalog, DataService, Dataset, Distribution } from "../../model/dsp/catalog/catalog";
import { Multilanguage } from "../../model/dsp/common";
import { AuthService } from "../../auth/auth.service";
import { AuthModule } from "../../auth/auth.module";
import { IamConfig, InitCatalog, RootConfig, ServerConfig } from "../../config";
import { plainToClass, plainToInstance } from "class-transformer";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard";
import { VerifiablePresentationStrategy } from "../../auth/verifiablePresentation.strategy";
import { ManagementGuard } from "../../auth/management.guard";
import { ManagementStrategy } from "../../auth/management.strategy";
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { SetupServer } from "msw/lib/node";
import { setupMockWalletServer, mockWalletConfig, sampleVpToken } from "../../auth/wallets/wallet.util.test";
import { TypeOrmTestHelper } from "../../utils/testhelper";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao } from "../../model/dsp/catalog/catalog.dao";


const dataset = new Dataset({
  id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
  title: "Test HTTP Dataset",
  distribution: [
    new Distribution({
      id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
      format: "dspace:HTTP",
      accessService: [
        new DataService({
          id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0"
        })
      ]
    })
  ]
})

const catalog = new Catalog({
  id: "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
  title: "Connector Catalog",
  publisher: "urn:connector:provider",
  description: [new Multilanguage("Catalog of datasets and services of this connector instance")],
  service: [
    new DataService({
      id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
      endpointURL: "http://localhost/",
      type: "connector"
    })
  ]
});

const catalogWithDataset = new Catalog({
  ...catalog,
  dataset: [dataset]
})


describe("CatalogController", () => {
  let catalogController: CatalogController;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
          TypeOrmTestHelper.instance.module([CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao]),
          TypeOrmModule.forFeature([CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao])
      ],
      controllers: [CatalogController],
      providers: [
        CatalogService,
        {
            provide: InitCatalog,
            useValue: {}
        },
        {
            provide: ServerConfig,
            useValue: {}
        }
      ],
    }).compile();
    catalogController = moduleRef.get(CatalogController);
    const catalogService = moduleRef.get(CatalogService);
  });

  describe("/request", () => {
    it("Empty catalog request should return empty catalog", async () => {
      const result = await catalogController.request(
        new CatalogRequestMessage({})
      );
      expect(result).toStrictEqual(await catalogWithDataset.serialize());
    });
  });
  describe("/datasets", () => {
    it("Dataset request with known id should result a dataset", async () => {
      const result = await catalogController.getDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      expect(result).toStrictEqual(await dataset.serialize());
    });
    it("Dataset request with unknown id should result in a 404", async () => {
      expect(async () => {
        await catalogController.getDataset(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        );
      }).rejects.toThrowError(expect.objectContaining({status: HttpStatus.NOT_FOUND}));
    });
  });
});

describe("Catalog Module", () => {
  let app: INestApplication;
  let server: SetupServer;
  let iamConfig: IamConfig;
  
  beforeAll(async () => {
    server = setupMockWalletServer();
    iamConfig = mockWalletConfig();
  }); 

  afterAll(async () => {
    server.close();
  })
  
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        VerifiablePresentationGuard,
        VerifiablePresentationStrategy,
        CatalogService,
      ],
    })
    .useMocker((token) => {
      if (token === AuthService) {
        return {
          requestToken() {return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU"},
          validateToken() {return true}
        }
      }
    })
    .compile();

    const catalogService = moduleRef.get(CatalogService);
    // catalogService.modifyCatalog(catalog)
    catalogService.addDataset(dataset)
    
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/request", () => {
    it("Empty catalog request should return empty catalog", async () => {
      const response = await request(app.getHttpServer())
        .post("/catalog/request")
        .set('Authorization', `Bearer ${sampleVpToken()}`)
        .send(await new CatalogRequestMessage({}).serialize())
        .expect(200)
      expect(response.body).toStrictEqual(await catalogWithDataset.serialize());
    });
    it("Invalid body should result in a 400", async () => {
      request(app.getHttpServer())
        .post("/catalog/request")
        .set('Authorization', `Bearer ${sampleVpToken()}`)
        .send(await new DatasetRequestMessage({dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"}).serialize())
        .expect(400)
    })
  });
  describe("/datasets", () => {
    it("Dataset request with known id should result a dataset", async () => {
      const response = await request(app.getHttpServer())
        .get("/catalog/datasets/urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea")
        .set('Authorization', `Bearer ${sampleVpToken()}`)
        .expect(200);

      expect(response.body).toStrictEqual(await dataset.serialize());
    });
    it("Dataset request with unknown id should result in a 404", async () => {
      request(app.getHttpServer())
        .get("/catalog/datasets/urn:uuid:00000000-0000-0000-0000-000000000000")
        .set('Authorization', `Bearer ${sampleVpToken()}`)
        .expect(404);
    });
  });
});
