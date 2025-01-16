import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
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
import { DSPError } from "../utils/errors/error.js";
import { DataPlaneService } from "./dataPlane.service.js";
import { AgreementService } from "../policy/agreement.service.js";
import {
  TypeOrmTestHelper,
  ServerConfig,
  AuthConfig,
  AuthClientService
} from "@tsg-dsp/common-api";

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
                "@type": "odrl:Agreement",
                "@id": "urn:uuid:24bcf50a-fb1b-4820-bbad-e015c6b8ab39",
                "odrl:assigner": "did:web:localhost",
                "odrl:assignee": "did:web:localhost",
                "odrl:target": "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                "dspace:timestamp": new Date().toISOString()
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
        endpointPrefix: "https://",
        callbackAddress: "https://httpbin.org/anything",
        managementAddress: "https://httpbin.org/mgmt",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);

      const dp = await dataPlaneService.getDataPlane(addedDataPlane.identifier);
      expect(dp).toBeDefined();
    });

    it("Dataplane update", async () => {
      const dataPlane: DataPlaneCreation = {
        dataplaneType: "http",
        endpointPrefix: "https://",
        callbackAddress: "https://httpbin.org/anything",
        managementAddress: "https://httpbin.org/mgmt",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);

      const dpDetails = await dataPlaneService.getDataPlaneDetails(
        addedDataPlane.identifier
      );
      expect(dpDetails).toBeDefined();
      if (dpDetails !== undefined) {
        dpDetails.callbackAddress = "https://google.com";
        const dpDetailsDto = {
          ...dpDetails,
          datasets: dpDetails.datasets
            ? await Promise.all(dpDetails.datasets.map((d) => d.serialize()))
            : undefined
        };

        await dataPlaneService.updateDataPlane(dpDetailsDto);
      }

      const dpDetailsUpdated = await dataPlaneService.getDataPlaneDetails(
        addedDataPlane.identifier
      );
      expect(dpDetailsUpdated?.callbackAddress).toBe("https://google.com");
    });

    it("Dataplane delete", async () => {
      const dataPlane: DataPlaneCreation = {
        dataplaneType: "http",
        endpointPrefix: "https://",
        callbackAddress: "https://httpbin.org/anything",
        managementAddress: "https://httpbin.org/mgmt",
        managementToken: "",
        catalogSynchronization: "pull",
        role: "consumer"
      };
      const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);
      await dataPlaneService.deleteDataplane(addedDataPlane.identifier);
      expect(
        dataPlaneService.getDataPlane(addedDataPlane.identifier)
      ).rejects.toThrow(DSPError);
    });
  }),
    describe("Update catalog", () => {
      it("fails when dataplane cannot be found", async () => {
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
                  endpointURL: "https://httpbin.org/anything"
                })
              ]
            })
          ]
        });
        await expect(
          dataPlaneService.updateCatalog(
            "test123",
            new Catalog({ dataset: [dataset] })
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
              format: "dspace:HTTP",
              accessService: [
                new DataService({
                  id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
                  endpointDescription: "dspace:connector",
                  endpointURL: "https://httpbin.org/anything"
                })
              ]
            })
          ]
        });

        const dataPlane: DataPlaneCreation = {
          dataplaneType: "http",
          endpointPrefix: "https://",
          callbackAddress: "https://httpbin.org/anything",
          managementAddress: "https://httpbin.org/mgmt",
          managementToken: "",
          catalogSynchronization: "pull",
          role: "consumer"
        };
        const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);

        const createdDataset = await dataPlaneService.updateCatalog(
          addedDataPlane.identifier,
          new Catalog({ dataset: [dataset] })
        );

        expect(createdDataset).toBeDefined();
        const catalog = await catalogService.getCatalogDao();
        expect(catalog.total).toEqual(1);
        expect(catalog.data._datasets?.length).toEqual(1);
        expect(catalog.data._datasets?.[0].hasPolicy).toHaveLength(1);
        expect(
          catalog.data._datasets?.[0]._distribution?.[0]?._accessService?.[0]
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
              format: "dspace:HTTP",
              accessService: [
                new DataService({
                  id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f1",
                  endpointURL: "https://httpbin.org/anything"
                })
              ]
            })
          ]
        });

        const dataPlane: DataPlaneCreation = {
          dataplaneType: "http",
          endpointPrefix: "https://",
          callbackAddress: "https://httpbin.org/anything",
          managementAddress: "https://httpbin.org/mgmt",
          managementToken: "",
          catalogSynchronization: "pull",
          role: "consumer"
        };
        const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane);
        const createdCatalog = await dataPlaneService.updateCatalog(
          addedDataPlane.identifier,
          new Catalog({ dataset: [dataset] })
        );
        createdCatalog!.title = "Updated Test HTTP Dataset";
        expect(createdCatalog).toBeDefined();

        let catalog = await catalogService.getCatalogDao();
        const lengthToMatch = catalog.data._datasets?.length;
        createdCatalog.dataset![0].distribution![0].accessService![0].endpointDescription =
          "dspace:connector";
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
          catalog?.data.dataset?.[0].distribution?.[0]?.accessService?.[0]
        ).toEqual(new DataService(catalog.data._services![0]));
      });
    });
});
