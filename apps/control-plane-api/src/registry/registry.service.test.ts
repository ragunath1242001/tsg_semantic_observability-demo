import { jest } from "@jest/globals";
import { ScheduleModule } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  PaginationOptionsDto,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { CatalogDto, defaultContext } from "@tsg-dsp/common-dsp";
import { plainToClass, plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer } from "msw/node";
import { Repository } from "typeorm";

import { IamConfig, RegistryConfig, RootConfig } from "../config.js";
import { DspClientService } from "../dsp/client/client.service.js";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao.js";
import { RegistryDao } from "../model/registry.dao.js";
import { DSPError } from "../utils/errors/error.js";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import {
  mockWalletConfig,
  setupMockWalletServer
} from "../vc-auth/wallets/wallet.util.test.js";
import { RegistryService } from "./registry.service.js";

describe("RegistryService", () => {
  let registryService: RegistryService;
  let server: SetupServer;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
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

    server = setupMockWalletServer(false);

    server.use(
      http.get(
        "http://127.0.0.1/tsg/management/credentials/dataspace",
        ({ request }) => {
          console.log("Handler", request.method, request.url);
          return HttpResponse.json([
            {
              created: "2024-03-18T10:53:21.000Z",
              modified: "2024-03-18T10:53:21.000Z",
              deleted: null,
              id: "did:web:localhost#test-init-credential",
              targetDid: "did:web:localhost",
              credential: {
                "@context": [
                  "https://www.w3.org/2018/credentials/v1",
                  "https://w3c.github.io/vc-jws-2020/contexts/v1/"
                ],
                type: ["VerifiableCredential"],
                id: "did:web:localhost#test-init-credential",
                issuer: "did:web:localhost",
                issuanceDate: "2024-03-18T10:53:21.231Z",
                expirationDate: "2024-06-18T09:53:21.231Z",
                credentialSubject: {
                  id: "did:web:localhost"
                },
                proof: {
                  type: "JsonWebSignature2020",
                  created: "2024-03-18T10:53:21.859Z",
                  proofPurpose: "assertionMethod",
                  jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..icXdCpZ0sHdbavYz5TxrW0nvjbD11_ZaIPGfjgP8YBA2vK8wygd_ZWr8x-kCsmCzcTQ7wFEMq31hdFHaUDK1DQ",
                  verificationMethod: "did:web:localhost#key-0"
                }
              },
              selfIssued: true
            }
          ]);
        }
      ),
      http.post("http://localhost/catalog/request", () => {
        return HttpResponse.json({
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
                      action: "read",
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
        } as CatalogDto);
      })
    );

    server.listen({
      onUnhandledRequest: "warn"
    });

    registryService = module.get(RegistryService);
  });

  afterAll(async () => {
    server.close();
    await TypeOrmTestHelper.instance.teardownTestDB();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("should be defined", () => {
    expect(registryService).toBeDefined();
  });

  describe("Crawling part", () => {
    it("Retrieve addresses from RegistryWalletClient", async () => {
      const addresses = await registryService.fetchAddresses();
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toEqual({
        didId: "did:web:localhost",
        address: "http://localhost"
      });
    });
    it("Retrieve addresses from RegistryWalletClient ready for further use", async () => {
      const addresses = await registryService.fetchAddresses();

      expect(addresses).toHaveLength(1);
      expect(addresses[0].address).toEqual("http://localhost");
    });

    it("Get catalogs based on addresses", async () => {
      const addresses = await registryService.fetchAddresses();
      const catalogs = await Promise.all(
        addresses.map((a) => registryService.getCatalog(a))
      );

      expect(catalogs).toHaveLength(1);
    });

    it("Crawl and retrieve", async () => {
      await registryService.crawl();

      const catalogs = await registryService.getAllCatalogs(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(catalogs.total).toBe(1);
      expect(catalogs.data[0].dataset).toHaveLength(1);
      expect(catalogs.data[0].service).toHaveLength(1);
    });
  });
  describe("Crawl fails when registry is disabled", () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout");
      await TypeOrmTestHelper.instance.setupTestDB();
      const iamConfig: IamConfig = mockWalletConfig();
      const registryConf = plainToClass(RegistryConfig, { useRegistry: false });
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmTestHelper.instance.module([RegistryDao]),
          TypeOrmModule.forFeature([RegistryDao]),
          ScheduleModule.forRoot()
        ],
        providers: [
          DspClientService,
          RegistryService,
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
            useValue: registryConf
          }
        ]
      }).compile();
      registryService = module.get(RegistryService);
    });

    it("Crawl fails when registry is disabled (default)", async () => {
      await expect(
        registryService.getAllCatalogs(PaginationOptionsDto.NO_PAGINATION)
      ).rejects.toThrow(DSPError);
    });
  });
});
