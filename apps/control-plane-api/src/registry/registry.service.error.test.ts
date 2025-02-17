import { jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { plainToClass, plainToInstance } from "class-transformer";
import { SetupServer, setupServer } from "msw/node";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import { mockWalletConfig } from "../vc-auth/wallets/wallet.util.test.js";
import { IamConfig, RegistryConfig, RootConfig } from "../config.js";
import { DspClientService } from "../dsp/client/client.service.js";
import { RegistryDao } from "../model/registry.dao.js";
import { RegistryService } from "./registry.service.js";
import { http, HttpResponse } from "msw";
import {
  TypeOrmTestHelper,
  AuthClientService,
  AuthConfig
} from "@tsg-dsp/common-api";
import { Repository } from "typeorm";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";

describe("No error when no dataspace credentials are found", () => {
  let registryService: RegistryService;
  let server: SetupServer;
  let logger: Logger;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    await TypeOrmTestHelper.instance.setupTestDB();
    let iamConfig: IamConfig = mockWalletConfig();
    const registryConfig = plainToClass(RegistryConfig, {
      useRegistry: true
    });
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([RegistryDao]),
        TypeOrmModule.forFeature([RegistryDao]),
        ScheduleModule.forRoot()
      ],
      providers: [
        DspClientService,
        RegistryService,
        Logger,
        {
          provide: VCAuthService,
          useValue: new VCAuthService(
            plainToInstance(RootConfig, { iam: iamConfig }),
            new AuthClientService(
              plainToInstance(AuthConfig, { enabled: false })
            ),
            null as unknown as Repository<AgreementDao>,
            null as unknown as Repository<TransferMonitorDao>
          )
        },
        {
          provide: IamConfig,
          useValue: iamConfig
        },
        {
          provide: RegistryConfig,
          useValue: registryConfig
        }
      ]
    }).compile();
    server = setupServer(
      http.get("http://127.0.0.1/tsg/management/credentials/dataspace", () => {
        return HttpResponse.error();
      })
    );

    server.listen({
      onUnhandledRequest: "warn"
    });
    registryService = module.get(RegistryService);
    logger = module.get<Logger>(Logger);
  });
  afterAll(() => server.close());
  it("No error when no dataspace credentials are found", async () => {
    const er = await registryService.fetchDidDocuments();
    const didDocuments = await registryService.fetchDidDocuments();
    expect(didDocuments).toHaveLength(0);
  });
});
