import { Test, TestingModule } from "@nestjs/testing"
import { CatalogService } from "./catalog.service"
import { TypeOrmTestHelper } from "../../utils/testhelper"
import { plainToClass } from "class-transformer"
import { InitCatalog, ServerConfig } from "../../config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CatalogDao, CatalogRecordDao, DataServiceDao, DatasetDao, DistributionDao, ResourceDao } from "../../model/dsp/catalog/catalog.dao"
import { DSPError } from "../../utils/errors/error"
import { Reference } from "../../model/dsp/common"
import { Catalog, DataService, Dataset, Distribution } from "../../model/dsp/catalog/catalog"

jest.useFakeTimers();
describe("Catalog Service", () => {
    let catalogService: CatalogService
    beforeAll(async () => {
        await TypeOrmTestHelper.instance.setupTestDB();
        const initCatalog = plainToClass(InitCatalog, {})
        const serverConfig = plainToClass(ServerConfig, {})

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmTestHelper.instance.module([CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao]),
                TypeOrmModule.forFeature([CatalogDao, CatalogRecordDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao])
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
                }
            ]
        }).compile();

        catalogService = moduleRef.get(CatalogService);
    })

    afterAll(() => {
        TypeOrmTestHelper.instance.teardownTestDB();
    })

    describe("Initializing catalog", () => {

        it("Throw error when catalog isn't available", async () => {
            await expect(catalogService.getCatalogDao()).rejects.toThrow(DSPError);
        })

        it("Catalog create", async () => {
            await catalogService.initalizeCatalog();
            // note that the catalog might not be filled (only with nulls)
            const catalog = await catalogService.getCatalogDao();

            expect(catalog).toBeDefined();
        })

        it("Modify catalog", async () => {
            const catalogDao = await catalogService.getCatalogDao();
            const homepage = new Reference('https://tno.nl/')
            catalogDao.homepage = homepage
            await catalogService.modifyCatalog(catalogDao)

            const catalogModified = await catalogService.getCatalogDao();
            expect(catalogModified.homepage).toEqual(homepage)
        })

        it("Add dataset", async () => {
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

            const catalogDao = await catalogService.getCatalogDao(true);
            expect(catalogDao._datasets?.length).toEqual(0)
            await catalogService.addDataset(dataset)

            const updatedCatalogDao = await catalogService.getCatalogDao(true);
            expect(updatedCatalogDao._datasets?.length).toEqual(1)

            const datasetDao = await catalogService.getDataset(dataset.id)
            expect(datasetDao).toBeDefined()
            expect(datasetDao!.title).toBe('Test HTTP dataset')

        })
        it("Throw error when dataset isn't available", async () => {
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
            await expect(catalogService.updateDataset("urn:testid", dataset)).rejects.toThrow(DSPError);
        })

        it("Update dataset", async () => {
            const toBeUpdatedDataset = await catalogService.getDataset("urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea")
            if (toBeUpdatedDataset !== undefined) {
                toBeUpdatedDataset.title = 'Updated Test HTTP Dataset'

                await catalogService.updateDataset(toBeUpdatedDataset.id, toBeUpdatedDataset)
            }

            const updatedDataset = await catalogService.getDataset("urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea")
            if (updatedDataset !== undefined) {
                expect(updatedDataset.title).toBe('Updated Test HTTP Dataset')
            }
        })

        it("Remove dataset", async () => {
            await catalogService.removeDataset("urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea")
            const catalog = await catalogService.getCatalogDao(true);
            expect(catalog._datasets!.length).toBe(0);

        })
    })
})