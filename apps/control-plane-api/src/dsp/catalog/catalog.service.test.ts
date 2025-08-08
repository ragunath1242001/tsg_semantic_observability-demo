import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServerConfig, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import {
  DataService,
  DataServiceDto,
  Dataset,
  DatasetDto,
  defaultContext,
  deserialize,
  Distribution,
  DistributionDto,
  ODRLAction,
  OfferDto,
  PermissionDto
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";

import { InitCatalog, PolicyConfig } from "../../config.js";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../../model/catalog.dao.js";
import { DataPlaneDao } from "../../model/dataPlanes.dao.js";
import { DSPError } from "../../utils/errors/error.js";
import { CatalogService } from "./catalog.service.js";

describe("Catalog Service", () => {
  let catalogService: CatalogService;
  beforeAll(async () => {
    jest.useFakeTimers();
    await TypeOrmTestHelper.instance.setupTestDB();
    const initCatalog = plainToClass(InitCatalog, {
      creator: "urn:uuid:de8e1b94-4169-4491-986d-6a1c528b867b",
      publisher: "did:web:localhost:3000",
      title: "Test Connector",
      description: "Connector catalog for testing purposes"
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
              value: "dataspace:MembershipCredential"
            }
          ]
        }
      ]
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
      providers: [
        CatalogService,
        {
          provide: InitCatalog,
          useValue: initCatalog
        },
        {
          provide: ServerConfig,
          useValue: serverConfig
        },
        {
          provide: PolicyConfig,
          useValue: policyConfig
        }
      ]
    }).compile();

    catalogService = moduleRef.get(CatalogService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
    jest.useRealTimers();
  });

  describe("Initializing catalog", () => {
    it("Throw error when catalog isn't available", async () => {
      await expect(catalogService.getCatalogDao()).rejects.toThrow(DSPError);
    });

    it("Catalog create", async () => {
      await catalogService.initialized;
      const catalog = await catalogService.getCatalogDao();

      expect(catalog.data).toBeDefined();
      expect(catalog.data.title).toBe("Test Connector");
      expect(catalog.data.publisher).toBe("did:web:localhost:3000");
    });

    it("Modify catalog", async () => {
      const catalogDao = await catalogService.getCatalogDao();
      catalogDao.data.homepage = "https://tno.nl/";
      await catalogService.modifyCatalog(catalogDao.data);

      const catalogModified = await catalogService.getCatalogDao();
      expect(catalogModified.data.homepage).toEqual("https://tno.nl/");
    });

    it("Add dataset", async () => {
      const dataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        title: "Test HTTP dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
              endpointURL: "https://httpbin.org/anything"
            })
          })
        ],
        extraProps: {
          "tsg:testExtraProp": {
            "@type": "tsg:ExtraPropClass",
            "@id": "urn:uuid:7584b2d4-e9b4-4df3-87cc-db4106bb52d8",
            "tsg:test": "Test"
          }
        }
      });

      const catalogDao = await catalogService.getCatalogDao();
      expect(catalogDao.data.dataset?.length).toEqual(0);
      await catalogService.addDataset(dataset);

      const updatedCatalogDao = await catalogService.getCatalogDao();
      expect(updatedCatalogDao.data.dataset).toHaveLength(1);
      const updatedDataset = await catalogService.getDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      expect(updatedDataset.title).toBe("Test HTTP dataset");
      expect(updatedDataset.distribution).toHaveLength(1);
      expect(updatedDataset.distribution?.[0]?.accessService).toMatchObject({
        endpointURL: "https://httpbin.org/anything"
      });

      //    A policy should be auto generated since we haven't defined one.
      expect(updatedDataset.hasPolicy).toHaveLength(1);
      expect(updatedDataset.hasPolicy?.[0].permission?.[0]?.action).toBe("use");
      expect(
        updatedDataset.hasPolicy?.[0].permission?.[0]?.constraint?.[0]
          ?.leftOperand
      ).toBe("dspace:credentialType");
      expect(
        updatedDataset.hasPolicy?.[0].permission?.[0]?.constraint?.[0]
          ?.rightOperand
      ).toBe("dataspace:MembershipCredential");

      expect(updatedDataset.extraProps["tsg:testExtraProp"]?.["tsg:test"]).toBe(
        "Test"
      );

      const datasetDao = await catalogService.getDataset(dataset.id);
      expect(datasetDao).toBeDefined();
      expect(datasetDao!.title).toBe("Test HTTP dataset");
      expect(datasetDao!.distribution).toHaveLength(1);
      expect(updatedDataset.distribution?.[0]?.accessService).toMatchObject({
        endpointURL: "https://httpbin.org/anything"
      });
      const dto = datasetDao.serialize();
      expect(dto["hasPolicy"]?.[0]?.["assigner"]).toBeDefined();
    });

    it("Add dataset for analytics data plane", async () => {
      const datasetId = "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0ceb";
      const datasetDto = {
        "@context": defaultContext(),
        "@id": datasetId,
        "@type": "Dataset",
        title: "Analytics Data Plane",
        description: ["Default dataset for the analytics data plane"],
        keyword: ["analytics"],
        theme: ["analytics"],
        language: "en",
        hasPolicy: [
          {
            "@type": "Offer",
            "@id": `${datasetId}:policy`,
            permission: [
              {
                "@type": "Permission",
                action: "use",
                target: datasetId,
                constraint: [
                  {
                    "@type": "Constraint",
                    leftOperand: "format",
                    operator: "eq",
                    rightOperand: "tsg:analytics"
                  }
                ]
              } as PermissionDto
            ]
          } as OfferDto
        ],
        distribution: [
          {
            "@type": "Distribution",
            "@id": `${datasetId}:application/analytics-data-plane`,
            title: "Analytics Data Plane (tsg:analytics)",
            format: "tsg:analytics",
            accessService: {
              "@type": "DataService",
              "@id": `${datasetId}:analytics-service`,
              title: "Analytics Data Plane Service",
              endpointDescription: "dspace:connector"
            } as DataServiceDto
          } as DistributionDto
        ]
      } as DatasetDto;
      const catalogDao = await catalogService.getCatalogDao();
      expect(catalogDao.data.dataset?.length).toEqual(1);
      await catalogService.addDataset(await deserialize<Dataset>(datasetDto));

      const updatedCatalogDao = await catalogService.getCatalogDao();
      expect(updatedCatalogDao.data.dataset).toHaveLength(2);
      const dataset = await catalogService.getDataset(datasetId);
      expect(dataset.title).toBe("Analytics Data Plane");

      expect(dataset.distribution).toHaveLength(1);
      expect(dataset.distribution?.[0]?.format).toBe("tsg:analytics");

      expect(dataset.distribution?.[0]?.accessService).toMatchObject({
        endpointURL: "http://localhost:3000"
      });

      //    A policy should be auto generated since we haven't defined one.
      expect(dataset.hasPolicy).toHaveLength(1);
      expect(dataset.hasPolicy?.[0].permission?.[0]?.action).toBe("use");
      expect(
        dataset.hasPolicy?.[0].permission?.[0]?.constraint?.[0]?.leftOperand
      ).toBe("format");
      expect(
        dataset.hasPolicy?.[0].permission?.[0]?.constraint?.[0]?.rightOperand
      ).toBe("tsg:analytics");
      expect(dataset.hasPolicy?.[0].permission?.[0]?.target).toBe(datasetId);
      expect(dataset.hasPolicy?.[0].assigner).toBeDefined();
      expect(dataset.hasPolicy?.[0].assigner).toBe("did:web:localhost:3000");
    });

    it("Throw error when dataset isn't available", async () => {
      const dataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        title: "Test HTTP dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
              endpointURL: "https://httpbin.org/anything"
            })
          })
        ]
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
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f1",
              endpointURL: "https://httpbin.org/anything/update"
            })
          })
        ]
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
      expect(updatedDataset!.distribution![0].accessService).toMatchObject({
        endpointURL: "https://httpbin.org/anything/update"
      });
    });

    it("Remove dataset", async () => {
      await catalogService.removeDataset(
        "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
      );
      const catalog = await catalogService.getCatalogDao();
      expect(catalog.data.dataset?.length).toBe(1);
    });
  });
});
