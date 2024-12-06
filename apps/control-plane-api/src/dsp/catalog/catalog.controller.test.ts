import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Catalog,
  CatalogRequestMessage,
  DataService,
  Dataset,
  DatasetRequestMessage,
  Distribution,
  Multilanguage
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { SetupServer } from "msw/lib/node";
import request from "supertest";
import { AuthService } from "../../auth/auth.service";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard";
import { VerifiablePresentationStrategy } from "../../auth/verifiablePresentation.strategy";
import {
  mockWalletConfig,
  sampleVpToken,
  setupMockWalletServer
} from "../../auth/wallets/wallet.util.test";
import { IamConfig, InitCatalog, ServerConfig } from "../../config";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../../model/catalog.dao";
import { TypeOrmTestHelper } from "../../utils/testhelper";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { DataPlaneDao } from "../../model/dataPlanes.dao";
import { PaginationOptionsDto } from "../../utils/pagination/pagination.options.dto";

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
});

const catalog = new Catalog({
  id: "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
  title: "Connector Catalog",
  publisher: "urn:connector:provider",
  description: ["Catalog of datasets and services of this connector instance"],
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
});

describe("CatalogController", () => {
  let catalogController: CatalogController;
  let catalogService: CatalogService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initCatalog = plainToClass(InitCatalog, {
      creator: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      publisher: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      title: "Test Connector",
      description: "Connector catalog for testing purposes"
    });
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
      controllers: [CatalogController],
      providers: [
        CatalogService,
        {
          provide: InitCatalog,
          useValue: initCatalog
        },
        {
          provide: ServerConfig,
          useValue: serverConfig
        }
      ]
    }).compile();
    catalogController = moduleRef.get(CatalogController);
    catalogService = moduleRef.get(CatalogService);
    await catalogService.initialized;
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("/request", () => {
    it("Empty catalog request should return empty catalog", async () => {
      const result = await catalogController.request(
        new PaginationOptionsDto(),
        new CatalogRequestMessage({})
      );
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
      expect(result.data["dcat:service"]?.length).toBe(1);
      expect(result.data["dct:creator"]).toBe(
        "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b"
      );
      expect(result.data["dct:publisher"]).toBe(
        "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b"
      );
      expect(result.data["dct:title"]).toBe("Test Connector");
    });
  });
  describe("/datasets", () => {
    it("Dataset request with known id should result a dataset", async () => {
      await catalogService.addDataset(dataset);

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
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
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
  });

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initCatalog = plainToClass(InitCatalog, {
      creator: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      publisher: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      title: "Test Connector",
      description: "Connector catalog for testing purposes"
    });
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
      controllers: [CatalogController],
      providers: [
        VerifiablePresentationGuard,
        VerifiablePresentationStrategy,
        CatalogService,
        {
          provide: InitCatalog,
          useValue: initCatalog
        },
        {
          provide: ServerConfig,
          useValue: serverConfig
        }
      ]
    })
      .useMocker((token) => {
        if (token === AuthService) {
          return {
            requestToken() {
              return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU";
            },
            validateToken() {
              return true;
            }
          };
        }
      })
      .compile();

    const catalogService = moduleRef.get(CatalogService);
    await catalogService.initialized;
    await catalogService.addDataset(dataset);

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
        .set("Authorization", `Bearer ${sampleVpToken()}`)
        .send(await new CatalogRequestMessage({}).serialize())
        .expect(200);

      expect(response.body.data["dcat:service"].length).toBe(1);
      expect(response.body.data["dct:creator"]).toBe(
        "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b"
      );
      expect(response.body.data["dct:publisher"]).toBe(
        "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b"
      );
      expect(response.body.data["dct:title"]).toBe("Test Connector");
    });
    it("Invalid body should result in a 400", async () => {
      request(app.getHttpServer())
        .post("/catalog/request")
        .set("Authorization", `Bearer ${sampleVpToken()}`)
        .send(
          await new DatasetRequestMessage({
            dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
          }).serialize()
        )
        .expect(400);
    });
  });
  describe("/datasets", () => {
    it("Dataset request with known id should result a dataset", async () => {
      const response = await request(app.getHttpServer())
        .get("/catalog/datasets/urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea")
        .set("Authorization", `Bearer ${sampleVpToken()}`)
        .expect(200);

      expect(response.body).toStrictEqual(await dataset.serialize());
    });
    it("Dataset request with unknown id should result in a 404", async () => {
      request(app.getHttpServer())
        .get("/catalog/datasets/urn:uuid:00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${sampleVpToken()}`)
        .expect(404);
    });
  });
});
