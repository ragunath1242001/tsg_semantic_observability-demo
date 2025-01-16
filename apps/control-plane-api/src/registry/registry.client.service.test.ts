import { Test, TestingModule } from "@nestjs/testing";
import { plainToClass, plainToInstance } from "class-transformer";
import { IamConfig, RegistryConfig, RootConfig } from "../config.js";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { RegistryClientService } from "./registry.client.service.js";
import { DSPError } from "../utils/errors/error.js";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import {
  mockWalletConfig,
  setupMockWalletServer
} from "../vc-auth/wallets/wallet.util.test.js";
import { defaultContext } from "@tsg-dsp/common-dsp";
import { AuthClientService, AuthConfig } from "@tsg-dsp/common-api";

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
        return HttpResponse.json([
          {
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
                    "dct:conformsTo": {
                      "@id": "https://httpbin.org/spec.json"
                    },
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
          }
        ]);
      })
    );
  });
  beforeEach(async () => {
    const registryConfig = plainToClass(RegistryConfig, {
      registryUrl: "http://localhost/registry"
    });
    let iamConfig: IamConfig = mockWalletConfig();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistryClientService,
        {
          provide: VCAuthService,
          useValue: new VCAuthService(
            plainToInstance(RootConfig, { iam: iamConfig }),
            new AuthClientService(
              plainToInstance(AuthConfig, { enabled: false })
            )
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
      let iamConfig: IamConfig = mockWalletConfig();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RegistryClientService,
          {
            provide: VCAuthService,
            useValue: new VCAuthService(
              plainToInstance(RootConfig, { iam: iamConfig }),
              new AuthClientService(
                plainToInstance(AuthConfig, { enabled: false })
              )
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
