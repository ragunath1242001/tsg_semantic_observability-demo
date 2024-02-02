import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { InitCatalog, ServerConfig } from "../config";
import { CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao } from "../model/dsp/catalog/catalog.dao";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { DataPlaneService } from "./dataPlane.service"
import { CatalogService } from "../dsp/catalog/catalog.service";
import { DataPlaneDao } from "../model/data-planes/dataPlanes.dao";
import { DataPlaneCreation } from "@libs/dtos";
import { DSPError } from "../utils/errors/error";
import { Dataset, Distribution, DataService } from "../model/dsp/catalog/catalog";

jest.useFakeTimers();
describe("DataPlane Service", () => {
    let dataPlaneService: DataPlaneService
    let catalogService: CatalogService
    beforeAll(async () => {
        await TypeOrmTestHelper.instance.setupTestDB();
        const initCatalog = plainToClass(InitCatalog, {})
        const serverConfig = plainToClass(ServerConfig, {})

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmTestHelper.instance.module([CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao, DataPlaneDao]),
                TypeOrmModule.forFeature([CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao, DataPlaneDao])
            ],
            providers: [
                DataPlaneService,
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

        dataPlaneService = moduleRef.get(DataPlaneService);
        catalogService = moduleRef.get(CatalogService);
    })

    afterAll(async () => {
        await TypeOrmTestHelper.instance.teardownTestDB();
    });

    describe("Add, get and update dataplane", () => {

        it("Dataplane creation", async () => {
            const dataPlane: DataPlaneCreation = {
                dataplaneType: "http",
                endpointPrefix: "https://",
                callbackAddress: "https://httpbin.org/anything",
                managementAddress: "https://httpbin.org/mgmt",
                managementToken: "",
                catalogSynchronization: "pull",
                role: "consumer"
            }
            const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane)

            const dp = await dataPlaneService.getDataPlane(addedDataPlane.identifier)
            expect(dp).toBeDefined();

        })

        it("Dataplane update", async () => {
            const dataPlane: DataPlaneCreation = {
                dataplaneType: "http",
                endpointPrefix: "https://",
                callbackAddress: "https://httpbin.org/anything",
                managementAddress: "https://httpbin.org/mgmt",
                managementToken: "",
                catalogSynchronization: "pull",
                role: "consumer"
            }
            const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane)

            const dpDetails = await dataPlaneService.getDataPlaneDetails(addedDataPlane.identifier)
            expect(dpDetails).toBeDefined();
            if (dpDetails !== undefined) {
                dpDetails.callbackAddress = "https://google.com"
                await dataPlaneService.updateDataPlane(dpDetails)
            }

            const dpDetailsUpdated = await dataPlaneService.getDataPlaneDetails(addedDataPlane.identifier)
            expect(dpDetailsUpdated?.callbackAddress).toBe("https://google.com")
        })
    }),
        describe("Update catalog", () => {

            it("fails when dataplane cannot be found", async () => {
                const dataset = new Dataset({
                    id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                    title: 'Test HTTP dataset',
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
                })
                await expect(dataPlaneService.updateCatalog("test123", dataset)).rejects.toThrow(DSPError);
            })

            it("creates dataset when none exists", async () => {
                await catalogService.initalizeCatalog();

                const dataset = new Dataset({
                    id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                    title: 'Test HTTP dataset',
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
                })

                const dataPlane: DataPlaneCreation = {
                    dataplaneType: "http",
                    endpointPrefix: "https://",
                    callbackAddress: "https://httpbin.org/anything",
                    managementAddress: "https://httpbin.org/mgmt",
                    managementToken: "",
                    catalogSynchronization: "pull",
                    role: "consumer"
                }
                const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane)

                const createdDataset = await dataPlaneService.updateCatalog(addedDataPlane.identifier, dataset)

                expect(createdDataset).toBeDefined();
                const catalog = await catalogService.getCatalogDao(true)
                expect(catalog._datasets?.length).toEqual(1)

            })

            it("updates dataset when one exists", async () => {
                await catalogService.initalizeCatalog();

                const dataset = new Dataset({
                    id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0ceb",
                    title: 'Test HTTP dataset',
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
                })

                const dataPlane: DataPlaneCreation = {
                    dataplaneType: "http",
                    endpointPrefix: "https://",
                    callbackAddress: "https://httpbin.org/anything",
                    managementAddress: "https://httpbin.org/mgmt",
                    managementToken: "",
                    catalogSynchronization: "pull",
                    role: "consumer"
                }
                const addedDataPlane = await dataPlaneService.addDataPlane(dataPlane)
                const createdDataset = await dataPlaneService.updateCatalog(addedDataPlane.identifier, dataset)
                createdDataset!.title = 'Updated Test HTTP Dataset'
                expect(createdDataset).toBeDefined();

                let catalog = await catalogService.getCatalogDao(true)
                const lengthToMatch = catalog._datasets?.length
                const updatedDataset = await dataPlaneService.updateCatalog(addedDataPlane.identifier, createdDataset!)

                expect(updatedDataset).toBeDefined();
                catalog = await catalogService.getCatalogDao(true)
                expect(catalog._datasets?.length).toEqual(lengthToMatch)

            })
        })
})