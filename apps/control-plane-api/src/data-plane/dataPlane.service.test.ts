import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  PaginationOptionsDto,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  AgreementDto,
  Catalog,
  DataPlaneCreation,
  DataService,
  Dataset,
  Distribution,
  ODRLAction,
  Offer,
  Permission
} from "@tsg-dsp/common-dsp";
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
import { DSPError } from "../utils/errors/error.js";
import { DataPlaneService } from "./dataPlane.service.js";

describe("DataPlane Service", () => {
  let dataPlaneService: DataPlaneService;
  let catalogService: CatalogService;
  beforeAll(async () => {
    jest.useFakeTimers();
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

    dataPlaneService = moduleRef.get(DataPlaneService);
    catalogService = moduleRef.get(CatalogService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
    jest.useRealTimers();
  });

  describe("Add, get, update and delete dataplane", () => {
    it("Error delete when there is no dataplane", async () => {
      await expect(dataPlaneService.deleteDataplane("testID")).rejects.toThrow(
        DSPError
      );
    });
    it("Dataplane creation", async () => {
      const dataPlane: DataPlaneCreation = {
        dataplaneType: "http",
        endpointPrefix: "/api",
        callbackAddress: "http://localhost/api/callback",
        managementAddress: "http://localhost/api/management",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);

      const dp = await dataPlaneService.getDataPlane(addedDataPlane.identifier);
      expect(dp).toBeDefined();
    });
    describe("Dataplane update", () => {
      it("Add", async () => {
        const dataPlane: DataPlaneCreation = {
          identifier: "urn:uuid:f0a10802-90b4-43f5-a8d9-71ccdf907126",
          dataplaneType: "http",
          endpointPrefix: "/api",
          callbackAddress: "http://localhost/api/callback",
          managementAddress: "http://localhost/api/management",
          managementToken: "",
          catalogSynchronization: "pull",
          role: "consumer"
        };
        await dataPlaneService.addDataPlane(dataPlane);
      });
      it("Update", async () => {
        const dpDetails = await dataPlaneService.getDataPlaneDetails(
          "urn:uuid:f0a10802-90b4-43f5-a8d9-71ccdf907126"
        );
        expect(dpDetails).toBeDefined();
        dpDetails.callbackAddress = "http://localhost/api/updated-callback";
        const dpDetailsDto = {
          ...dpDetails,
          datasets: dpDetails.datasets
            ? await Promise.all(dpDetails.datasets.map((d) => d.serialize()))
            : undefined
        };

        await dataPlaneService.updateDataPlane(
          "urn:uuid:f0a10802-90b4-43f5-a8d9-71ccdf907126",
          dpDetailsDto
        );
      });
      it("Verify", async () => {
        const dpDetailsUpdated = await dataPlaneService.getDataPlaneDetails(
          "urn:uuid:f0a10802-90b4-43f5-a8d9-71ccdf907126"
        );
        expect(dpDetailsUpdated?.callbackAddress).toBe(
          "http://localhost/api/updated-callback"
        );
      });
    });

    it("Dataplane delete", async () => {
      const dataPlane: DataPlaneCreation = {
        dataplaneType: "http",
        endpointPrefix: "/api",
        callbackAddress: "http://localhost/api/callback",
        managementAddress: "http://localhost/api/management",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);
      await dataPlaneService.deleteDataplane(addedDataPlane.identifier);
      await expect(
        dataPlaneService.getDataPlane(addedDataPlane.identifier)
      ).rejects.toThrow(DSPError);
    });
  });
  describe("Update catalog", () => {
    it("fails when dataplane cannot be found", async () => {
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
        dataPlaneService.updateCatalog(
          "test123",
          new Catalog({
            participantId: "did:web:localhost",
            dataset: [dataset]
          })
        )
      ).rejects.toThrow(DSPError);
    });

    it("creates dataset when none exists", async () => {
      await catalogService.initializeCatalog();

      const dataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
        title: "Test HTTP dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
              endpointDescription: "dspace:connector",
              endpointURL: "https://httpbin.org/anything"
            })
          })
        ]
      });

      const dataPlane: DataPlaneCreation = {
        dataplaneType: "http",
        endpointPrefix: "/api",
        callbackAddress: "http://localhost/api/callback",
        managementAddress: "http://localhost/api/management",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);

      const createdDataset = await dataPlaneService.updateCatalog(
        addedDataPlane.identifier,
        new Catalog({ participantId: "did:web:localhost", dataset: [dataset] })
      );

      expect(createdDataset).toBeDefined();
      const catalog = await catalogService.getCatalogDao();
      expect(catalog.total).toEqual(1);
      expect(catalog.data._datasets?.length).toEqual(1);
      expect(catalog.data._datasets?.[0].hasPolicy).toHaveLength(1);
      expect(
        catalog.data._datasets?.[0]._distribution?.[0]?._accessService
      ).toEqual(catalog.data._services?.[0]);
    });

    it("updates dataset when one exists", async () => {
      await catalogService.initializeCatalog();

      const dataset = new Dataset({
        id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0ceb",
        title: "Test HTTP dataset",
        publisher: "me",
        hasPolicy: [
          new Offer({
            assigner: "me",
            permission: [
              new Permission({
                target: "everyone",
                action: ODRLAction.READ
              })
            ]
          })
        ],
        distribution: [
          new Distribution({
            id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46133",
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f1",
              endpointURL: "https://httpbin.org/anything"
            })
          })
        ]
      });

      const dataPlane: DataPlaneCreation = {
        dataplaneType: "http",
        endpointPrefix: "/api",
        callbackAddress: "http://localhost/api/callback",
        managementAddress: "http://localhost/api/management",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);
      const createdCatalog = await dataPlaneService.updateCatalog(
        addedDataPlane.identifier,
        new Catalog({ participantId: "did:web:localhost", dataset: [dataset] })
      );
      createdCatalog!.title = "Updated Test HTTP Dataset";
      expect(createdCatalog).toBeDefined();

      let catalog = await catalogService.getCatalogDao();
      const lengthToMatch = catalog.data._datasets?.length;

      (
        createdCatalog.dataset![0].distribution![0].accessService as DataService
      ).endpointDescription = "dspace:connector";
      const updatedCatalog = await dataPlaneService.updateCatalog(
        addedDataPlane.identifier,
        createdCatalog
      );

      expect(updatedCatalog).toBeDefined();
      catalog = await catalogService.getCatalogDao();
      expect(catalog.data._datasets?.length).toEqual(lengthToMatch);
      const datasetToCheck = catalog.data._datasets?.find(
        (dataset) =>
          dataset.id === "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0ceb"
      );
      expect(datasetToCheck?.hasPolicy?.[0].assigner).toEqual("me");
      expect(createdCatalog.title).toEqual(updatedCatalog.title);
      expect(
        catalog?.data.dataset?.[0].distribution?.[0]?.accessService
      ).toEqual(new DataService(catalog.data._services![0]));
    });

    it("Update single dataset", async () => {
      const dataPlane = await dataPlaneService.getDataPlanes(
        PaginationOptionsDto.NO_PAGINATION
      );
      const dataplaneId = dataPlane.data[0]!.identifier;

      const dataset = new Dataset({
        id: "urn:uuid:7e2a79c3-cbbe-4cb3-83a1-788521b0c980",
        title: "Test collection HTTP dataset",
        publisher: "me",
        hasPolicy: [
          new Offer({
            assigner: "me",
            permission: [
              new Permission({
                target: "everyone",
                action: ODRLAction.READ
              })
            ]
          })
        ],
        distribution: [
          new Distribution({
            id: "urn:uuid:dd58de12-9118-4651-bdaa-8d5bd4dc070e",
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:2d6f9fbb-5c79-4c8b-8b91-b3f917fe4272",
              endpointURL: "https://httpbin.org/anything"
            })
          })
        ]
      });

      await dataPlaneService.addDataset(dataplaneId, dataset);
      dataset.title = "Updated Test collection HTTP Dataset";
      await dataPlaneService.updateDataset(dataplaneId, dataset.id, dataset);
      await expect(
        dataPlaneService.updateDataset(
          dataplaneId,
          "urn:uuid:0000000-0000-0000-0000-000000000000",
          dataset
        )
      ).rejects.toThrow("does not exist");
      await expect(
        dataPlaneService.updateDataset(
          dataPlane.data[1]!.identifier,
          dataset.id,
          dataset
        )
      ).rejects.toThrow("is not associated with the data plane with id");
      await dataPlaneService.deleteDataset(dataplaneId, dataset.id);
      await expect(
        dataPlaneService.deleteDataset(dataplaneId, dataset.id)
      ).rejects.toThrow("Could not find dataset with id");
    });
  });
});
