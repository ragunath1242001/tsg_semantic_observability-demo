import { Test, TestingModule } from "@nestjs/testing";
import { RegistryService } from "./registry.service";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DspClientService } from "../dsp/client/client.service";
import { AuthService } from "../auth/auth.service";
import { plainToClass, plainToInstance } from "class-transformer";
import { AuthConfig, IamConfig, RegistryConfig, RootConfig } from "../config";
import { SetupServer } from "msw/node";
import {
  mockWalletConfig,
  setupMockWalletServer
} from "../auth/wallets/wallet.util.test";
import { HttpResponse, http } from "msw";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthClientService } from "../auth/auth.client.service";
import { RegistryDao } from "../model/registry.dao";
import { DSPError } from "../utils/errors/error";
import { defaultContext } from "@tsg-dsp/common-dsp";
import { PaginationOptionsDto } from "../utils/pagination/pagination.options.dto";

describe("RegistryService", () => {
  let registryService: RegistryService;
  let server: SetupServer;

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
          "@type": "dcat:Catalog",
          "@id": "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
          "dct:creator": "did:web:localhost",
          "dct:description": [
            {
              "@value": "Test connector",
              "@language": "en"
            }
          ],
          "dct:publisher": "did:web:localhost",
          "dct:title": "Test Catalog",
          "dcat:dataset": [
            {
              "@type": "dcat:Dataset",
              "@id": "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
              "dct:title": "HTTPBin",
              "odrl:hasPolicy": [
                {
                  "@type": "odrl:Offer",
                  "@id": "urn:uuid:03be4d42-fde2-40b6-8351-185dbc174fb2",
                  "odrl:assigner": "did:web:localhost",
                  "odrl:permission": [
                    {
                      "@type": "odrl:Permission",
                      "odrl:action": "odrl:read",
                      "odrl:target":
                        "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                      "odrl:constraint": [
                        {
                          "@type": "odrl:Constraint",
                          "odrl:rightOperand": "dspace:sameDataSpace",
                          "odrl:leftOperand": "dspace:identity",
                          "odrl:operator": "odrl:isPartOf"
                        }
                      ]
                    }
                  ]
                }
              ],
              "dcat:distribution": [
                {
                  "@type": "dcat:Distribution",
                  "@id": "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
                  "dcat:accessService": [
                    {
                      "@type": "dcat:DataService",
                      "@id": "urn:uuid:946b0e29-b006-430a-8e4d-ddf196104b67",
                      "dcat:endpointURL": "http://localhost:3000/api/"
                    }
                  ],
                  "dct:conformsTo": { "@id": "https://httpbin.org/spec.json" },
                  "dct:format": "dspace:HTTP",
                  "dct:title": "Version 0.9.2"
                }
              ]
            }
          ],
          "dcat:service": [
            {
              "@type": "dcat:DataService",
              "@id": "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
              "dcat:endpointDescription": "dspace:connector",
              "dcat:endpointURL": "https://cp.localhost/control-plane"
            }
          ]
        });
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
      expect(catalogs.data[0]["dcat:dataset"]).toHaveLength(1);
      expect(catalogs.data[0]["dcat:service"]).toHaveLength(1);
    });
  });
  describe("Crawl fails when registry is disabled", () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout");
      await TypeOrmTestHelper.instance.setupTestDB();
      let iamConfig: IamConfig = mockWalletConfig();
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
