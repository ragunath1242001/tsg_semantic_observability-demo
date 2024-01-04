import { plainToClass } from "class-transformer";
import { TypeOrmTestHelper } from "../../utils/testhelper";
import { NegotiationService } from "./negotiation.service";
import { InitCatalog, ServerConfig } from "../../config";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";

describe("DataPlane Service", () => {
    let negotiationService: NegotiationService
    beforeAll(async () => {
        await TypeOrmTestHelper.instance.setupTestDB();
        const initCatalog = plainToClass(InitCatalog, {})
        const serverConfig = plainToClass(ServerConfig, {})

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmTestHelper.instance.module([]),
                TypeOrmModule.forFeature([])
            ],
            providers: [
                NegotiationService,
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

        negotiationService = moduleRef.get(NegotiationService);
    })

    afterAll(() => {
        TypeOrmTestHelper.instance.teardownTestDB();
    })
})