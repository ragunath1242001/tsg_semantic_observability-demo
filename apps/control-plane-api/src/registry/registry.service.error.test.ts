import { Logger } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { plainToClass, plainToInstance } from "class-transformer";
import { SetupServer, setupServer } from "msw/node";
import { AuthClientService } from "../auth/auth.client.service";
import { AuthService } from "../auth/auth.service";
import { mockWalletConfig } from "../auth/wallets/wallet.util.test";
import { IamConfig, RegistryConfig, RootConfig, AuthConfig } from "../config";
import { DspClientService } from "../dsp/client/client.service";
import { RegistryDao } from "../model/registry.dao";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { RegistryService } from "./registry.service";
import { http, HttpResponse } from "msw";

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
          provide: AuthService,
          useValue: new AuthService(
            plainToInstance(RootConfig, { iam: iamConfig }),
            new AuthClientService(
              plainToInstance(AuthConfig, { enabled: false })
            )
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
    console.log("this one");
    const er = await registryService.fetchDidDocuments();
    const didDocuments = await registryService.fetchDidDocuments();
    expect(didDocuments).toHaveLength(0);
  });
});
