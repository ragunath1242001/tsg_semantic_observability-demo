import { Test, TestingModule } from "@nestjs/testing";
import { AuthClientService, AuthConfig } from "@tsg-dsp/common-api";
import { CatalogDto, defaultContext } from "@tsg-dsp/common-dsp";
import { plainToClass, plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer } from "msw/node";
import { Repository } from "typeorm";

import { IamConfig, RegistryConfig, RootConfig } from "../config.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { DSPError } from "../utils/errors/error.js";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import {
  mockWalletConfig,
  setupMockWalletServer
} from "../vc-auth/wallets/wallet.util.test.js";
import { RegistryClientService } from "./registry.client.service.js";

describe("RegistryClientService", () => {
  let registryClientService: RegistryClientService;
  let server: SetupServer;

  beforeAll(async () => {
    server = setupMockWalletServer();
    server.use(
      http.get("http://localhost/registry/addresses", () => {
        return HttpResponse.json([{ didId: "test", address: "test" }]);
      }),
      http.get("http://localhost/registry", () => {
        return HttpResponse.json<CatalogDto[]>([
          {
            "@context": defaultContext(),
            "@type": "Catalog",
            "@id": "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
            participantId: "did:web:localhost",
            creator: "did:web:localhost",
            description: ["Test connector"],
            publisher: "did:web:localhost",
            title: "Test Catalog",
            dataset: [
              {
                "@type": "Dataset",
                "@id": "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                title: "HTTPBin",
                hasPolicy: [
                  {
                    "@type": "Offer",
                    "@id": "urn:uuid:03be4d42-fde2-40b6-8351-185dbc174fb2",
                    assigner: "did:web:localhost",
                    permission: [
                      {
                        "@type": "Permission",
                        action: "odrl:read",
                        target: "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                        constraint: [
                          {
                            "@type": "Constraint",
                            rightOperand: "dspace:sameDataSpace",
                            leftOperand: "dspace:identity",
                            operator: "isPartOf"
                          }
                        ]
                      }
                    ]
                  }
                ],
                distribution: [
                  {
                    "@type": "Distribution",
                    "@id": "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
                    accessService: {
                      "@type": "DataService",
                      "@id": "urn:uuid:946b0e29-b006-430a-8e4d-ddf196104b67",
                      endpointURL: "http://localhost:3000/api/"
                    },
                    conformsTo: ["https://httpbin.org/spec.json"],
                    format: "tsg:HTTP",
                    title: "Version 0.9.2"
                  }
                ]
              }
            ],
            service: [
              {
                "@type": "DataService",
                "@id": "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
                endpointDescription: "dspace:connector",
                endpointURL: "https://cp.localhost/control-plane"
              }
            ]
          }
        ]);
      })
    );
  });
  beforeEach(async () => {
    const registryConfig = plainToClass(RegistryConfig, {
      registryUrl: "http://localhost/registry"
    });
    const iamConfig: IamConfig = mockWalletConfig();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistryClientService,
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
          provide: RegistryConfig,
          useValue: registryConfig
        }
      ]
    }).compile();

    registryClientService = module.get(RegistryClientService);
  });

  afterAll(async () => {
    server.close();
  });

  it("should be defined", () => {
    expect(registryClientService).toBeDefined();
  });

  describe("Should error without registry URL", () => {
    beforeEach(async () => {
      const registryConfig = plainToClass(RegistryConfig, {});
      const iamConfig: IamConfig = mockWalletConfig();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RegistryClientService,
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
            provide: RegistryConfig,
            useValue: registryConfig
          }
        ]
      }).compile();

      registryClientService = module.get(RegistryClientService);
    });
    it("should raise error without registry URL", async () => {
      await expect(registryClientService.requestCatalogs()).rejects.toThrow(
        DSPError
      );
    });
  });
  describe("Should send right outward requests.", () => {
    it("should return catalogs on request catalogs", async () => {
      const catalogs = await registryClientService.requestCatalogs();
      expect(catalogs).toBeDefined();
    });
    it("should return addresses on request addresses", async () => {
      const addresses = await registryClientService.requestAddresses();
      expect(addresses).toBeDefined();
    });
  });
});
