import { Test, TestingModule } from "@nestjs/testing";
import { CatalogController } from "./catalog.controller";
import { CatalogRequestMessage, DatasetRequestMessage } from "../../model/dsp/catalog/messages";
import { CatalogService } from "../../services/catalog.service";
import { HttpException, HttpStatus, INestApplication } from "@nestjs/common";
import request from "supertest";

describe("CatalogController", () => {
  let catalogController: CatalogController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [CatalogService],
    }).compile();

    catalogController = moduleRef.get<CatalogController>(CatalogController);
  });

  describe("/request", () => {
    it("Empty catalog request should return empty catalog", async () => {
      const result = await catalogController.request(
        new CatalogRequestMessage({})
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
        "@type": "dcat:Catalog",
      });
    });
  });
  it("Invalid body should result in a 400", async () => {
    expect(async() => {
      await catalogController.request(
        new DatasetRequestMessage({dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"})
      );
    }).rejects.toThrowError(expect.objectContaining({status: HttpStatus.BAD_REQUEST}));
  });
  describe("/datasets", () => {
    it("Dataset request with known id should result a dataset", async () => {
      const result = await catalogController.getDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      expect(result).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        "@type": "dcat:Dataset",
      });
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [CatalogService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/request", () => {
    it("Empty catalog request should return empty catalog", async () => {
      request(app.getHttpServer())
        .post("/catalog/request")
        .send(await new CatalogRequestMessage({}).serialize())
        .expect(200)
        .then((response) => {
          expect(response.body).toStrictEqual({
            "@context": "https://w3id.org/dspace/v0.8/context.json",
            "@id": "urn:uuid:84f5328f-1d89-4f98-98b1-57b5600c8085",
            "@type": "dcat:Catalog",
          });
        });
    });
    it("Invalid body should result in a 400", async () => {
      request(app.getHttpServer())
        .post("/catalog/request")
        .send(await new DatasetRequestMessage({dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"}).serialize())
        .expect(400)
    })
  });
  describe("/datasets", () => {
    it("Dataset request with known id should result a dataset", async () => {
      const response = await request(app.getHttpServer())
        .get("/catalog/datasets/urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea")
        .expect(200);

      expect(response.body).toStrictEqual({
        "@context": "https://w3id.org/dspace/v0.8/context.json",
        "@id": "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        "@type": "dcat:Dataset",
      });
    });
    it("Dataset request with unknown id should result in a 404", async () => {
      request(app.getHttpServer())
        .get("/catalog/datasets/urn:uuid:00000000-0000-0000-0000-000000000000")
        .expect(404);
    });
  });
});
