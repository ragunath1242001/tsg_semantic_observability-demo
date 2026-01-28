import { Logger } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { plainToClass, plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { Repository } from "typeorm";
import { vi } from "vitest";

import { IamConfig, RegistryConfig, RootConfig } from "../config.js";
import { DspClientService } from "../dsp/client/client.service.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { RegistryDao } from "../model/registry.dao.js";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import { mockWalletConfig } from "../vc-auth/wallets/wallet.util.test.js";
import { RegistryService } from "./registry.service.js";

describe("No error when no dataspace credentials are found", () => {
  let registryService: RegistryService;
  let server: SetupServer;

  beforeAll(async () => {
    vi.useFakeTimers();
    vi.spyOn(global, "setTimeout");
    await TypeOrmTestHelper.instance.setupTestDB();
    const iamConfig: IamConfig = mockWalletConfig();
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
  });
  afterAll(() => server.close());
  it("No error when no dataspace credentials are found", async () => {
    await registryService.fetchDidDocuments();
    const didDocuments = await registryService.fetchDidDocuments();
    expect(didDocuments).toHaveLength(0);
  });
});
