import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DataService,
  Dataset,
  Distribution,
  ODRLAction,
} from "@libs/common-dsp";
import { plainToClass } from "class-transformer";
import { InitCatalog, PolicyConfig, ServerConfig } from "../../config";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao,
} from "../../model/catalog.dao";
import { DSPError } from "../../utils/errors/error";
import { TypeOrmTestHelper } from "../../utils/testhelper";
import { CatalogService } from "./catalog.service";
import { DataPlaneDao } from "../../model/dataPlanes.dao";

describe("Catalog Service", () => {
  let catalogService: CatalogService;
  beforeAll(async () => {
    jest.useFakeTimers();
    await TypeOrmTestHelper.instance.setupTestDB();
    const initCatalog = plainToClass(InitCatalog, {
      creator: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      publisher: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      title: "Test Connector",
      description: "Connector catalog for testing purposes",
    });
    const serverConfig = plainToClass(ServerConfig, {});
    const policyConfig = plainToClass(PolicyConfig, {
      type: "rules",
      permissions: [
        {
          action: ODRLAction.USE,
          constraints: [
            {
              type: "CredentialType",
              value: "dataspace:MembershipCredential",
            },
          ],
        },
      ],
    });

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
      providers: [
        CatalogService,
        {
          provide: InitCatalog,
          useValue: initCatalog,
        },
        {
          provide: ServerConfig,
          useValue: serverConfig,
        },
        {
          provide: PolicyConfig,
          useValue: policyConfig,
        },
      ],
    }).compile();

    catalogService = moduleRef.get(CatalogService);
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
    jest.useRealTimers();
  });

  describe("Initializing catalog", () => {
    it("Throw error when catalog isn't available", async () => {
      await expect(catalogService.getCatalogDao()).rejects.toThrow(DSPError);
    });

    it("Catalog create", async () => {
      await catalogService.initialized;
      const catalog = await catalogService.getCatalogDao();

      expect(catalog).toBeDefined();
      expect(catalog.title).toBe("Test Connector");
      expect(catalog.publisher).toBe(
        "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b"
      );
    });

    it("Modify catalog", async () => {
      const catalogDao = await catalogService.getCatalogDao();
      catalogDao.homepage = "https://tno.nl/";
      await catalogService.modifyCatalog(catalogDao);

      const catalogModified = await catalogService.getCatalogDao();
      expect(catalogModified.homepage).toEqual("https://tno.nl/");
    });

    it("Add dataset", async () => {
      const dataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        title: "Test HTTP dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
            format: "dspace:HTTP",
            accessService: [
              new DataService({
                id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
                endpointURL: "https://httpbin.org/anything",
              }),
            ],
          }),
        ],
      });

      const catalogDao = await catalogService.getCatalogDao(true);
      expect(catalogDao.dataset?.length).toEqual(0);
      await catalogService.addDataset(dataset);

      const updatedCatalogDao = await catalogService.getCatalogDao(true);
      expect(updatedCatalogDao.dataset).toHaveLength(1);
      expect(updatedCatalogDao.dataset?.[0]?.title).toBe("Test HTTP dataset");
      expect(updatedCatalogDao.dataset?.[0]?.distribution).toHaveLength(1);
      expect(
        updatedCatalogDao.dataset?.[0]?.distribution?.[0]?.accessService
      ).toHaveLength(1);
      expect(
        updatedCatalogDao.dataset?.[0]?.distribution?.[0]?.accessService?.[0]
          ?.endpointURL
      ).toBe("https://httpbin.org/anything");

      //    A policy should be auto generated since we haven't defined one.
      expect(updatedCatalogDao.dataset?.[0].hasPolicy).toHaveLength(1);
      expect(
        updatedCatalogDao.dataset?.[0]?.hasPolicy?.[0].permission?.[0]?.action
      ).toBe("odrl:use");
      expect(
        updatedCatalogDao.dataset?.[0]?.hasPolicy?.[0].permission?.[0]
          ?.constraint?.[0]?.leftOperand
      ).toBe("dspace:credentialType");
      expect(
        updatedCatalogDao.dataset?.[0]?.hasPolicy?.[0].permission?.[0]
          ?.constraint?.[0]?.rightOperand
      ).toBe("dataspace:MembershipCredential");

      const datasetDao = await catalogService.getDataset(dataset.id);
      expect(datasetDao).toBeDefined();
      expect(datasetDao!.title).toBe("Test HTTP dataset");
      expect(datasetDao!.distribution).toHaveLength(1);
      expect(datasetDao!.distribution?.[0]?.accessService).toHaveLength(1);
      expect(
        datasetDao!.distribution?.[0]?.accessService?.[0]?.endpointURL
      ).toBe("https://httpbin.org/anything");
      const dto = await datasetDao.serialize();
      expect(dto["odrl:hasPolicy"]?.[0]?.["odrl:assigner"]).toBeDefined();
    });
    it("Throw error when dataset isn't available", async () => {
      const dataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        title: "Test HTTP dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
            format: "dspace:HTTP",
            accessService: [
              new DataService({
                id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
                endpointURL: "https://httpbin.org/anything",
              }),
            ],
          }),
        ],
      });
      await expect(
        catalogService.updateDataset("urn:testid", dataset)
      ).rejects.toThrow(DSPError);
    });

    it("Update dataset", async () => {
      const toBeUpdatedDataset = await catalogService.getDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      if (toBeUpdatedDataset !== undefined) {
        toBeUpdatedDataset.title = "Updated Test HTTP Dataset";

        await catalogService.updateDataset(
          toBeUpdatedDataset.id,
          toBeUpdatedDataset
        );
      }

      const updatedDataset = await catalogService.getDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      if (updatedDataset !== undefined) {
        expect(updatedDataset.title).toBe("Updated Test HTTP Dataset");
      }
    });

    it("Update dataset with changing sub-relation IDs", async () => {
      const toBeUpdatedDataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        title: "Second Updated Test HTTP Dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46124",
            format: "dspace:HTTP",
            accessService: [
              new DataService({
                id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f1",
                endpointURL: "https://httpbin.org/anything/update",
              }),
            ],
          }),
        ],
      });
      await catalogService.updateDataset(
        toBeUpdatedDataset.id,
        toBeUpdatedDataset
      );

      const updatedDataset = await catalogService.getDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );

      expect(updatedDataset!.title).toBe("Second Updated Test HTTP Dataset");
      expect(updatedDataset!.distribution).toHaveLength(1);
      expect(updatedDataset!.distribution![0].accessService).toHaveLength(1);
      expect(
        updatedDataset!.distribution![0].accessService![0].endpointURL
      ).toBe("https://httpbin.org/anything/update");
    });

    it("Remove dataset", async () => {
      await catalogService.removeDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      const catalog = await catalogService.getCatalogDao(true);
      expect(catalog.dataset?.length).toBe(0);
    });
  });
});
