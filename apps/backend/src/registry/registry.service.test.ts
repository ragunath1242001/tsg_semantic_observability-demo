import { Test, TestingModule } from "@nestjs/testing";
import { RegistryService } from "./registry.service";
import { TypeOrmTestHelper } from "../utils/testhelper";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao,
} from "../model/dsp/catalog/catalog.dao";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DspClientService } from "../dsp/client/client.service";
import { AuthService } from "../auth/auth.service";
import { DidResolverService } from "./did.resolver.service";
import { plainToClass, plainToInstance } from "class-transformer";
import { IamConfig, RegistryConfig, RootConfig } from "../config";
import { SetupServer } from "msw/lib/node";
import {
  mockWalletConfig,
  setupMockWalletServer,
} from "../auth/wallets/wallet.util.test";
import { HttpResponse, http } from "msw";
import { CatalogService } from "../dsp/catalog/catalog.service";
import { ScheduleModule } from "@nestjs/schedule";

describe("RegistryService", () => {
  let registryService: RegistryService;
  let server: SetupServer;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, "setTimeout");
    await TypeOrmTestHelper.instance.setupTestDB();
    let iamConfig: IamConfig = mockWalletConfig();
    const registryConfig = plainToClass(RegistryConfig, {});
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
        ]),
        TypeOrmModule.forFeature([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
        ]),
        ScheduleModule.forRoot(),
      ],
      providers: [
        DidResolverService,
        CatalogService,
        DspClientService,
        RegistryService,
        {
          provide: AuthService,
          useValue: new AuthService(
            plainToInstance(RootConfig, { iam: iamConfig })
          ),
        },
        {
          provide: IamConfig,
          useValue: iamConfig,
        },
        {
          provide: RegistryConfig,
          useValue: registryConfig,
        },
      ],
    }).compile();

    server = setupMockWalletServer();

    server.use(
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json({
          "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/",
          ],
          id: "did:web:localhost",
          verificationMethod: [
            {
              id: "did:web:localhost#key-0",
              type: "JsonWebKey2020",
              controller: "did:web:localhost",
              publicKeyJwk: {
                kty: "OKP",
                alg: "EdDSA",
                crv: "Ed25519",
                x: "Hwltj2aq8ig-VBF5GZJQPlwz6PrxGXpG2rLX0oYwYeg",
              },
            },
          ],
          assertionMethod: ["did:web:localhost#key-0"],
          service: [
            {
              id: "did:web:localhost#oid4vci",
              type: "OID4VCI",
              serviceEndpoint: "http://localhost",
            },
            {
              id: "did:web:localhost",
              type: "connector",
              serviceEndpoint: "http://localhost",
            },
          ],
        });
      }),
      http.post("http://localhost/catalog/request", () => {
        return HttpResponse.json({
          "@context": "https://w3id.org/dspace/v0.8/context.json",
          "@type": "dcat:Catalog",
          "@id": "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
          "dct:creator": "did:web:localhost",
          "dct:description": [
            {
              "@value": "Test connector",
              "@language": "en",
            },
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
                          "odrl:operator": "odrl:isPartOf",
                        },
                      ],
                    },
                  ],
                },
              ],
              "dcat:distribution": [
                {
                  "@type": "dcat:Distribution",
                  "@id": "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
                  "dcat:accessService": [
                    {
                      "@type": "dcat:DataService",
                      "@id": "urn:uuid:946b0e29-b006-430a-8e4d-ddf196104b67",
                      "dcat:endpointURL": "http://localhost:3000/api/",
                    },
                  ],
                  "dct:conformsTo": { "@id": "https://httpbin.org/spec.json" },
                  "dct:format": "dspace:HTTP",
                  "dct:title": "Version 0.9.2",
                },
              ],
            },
          ],
          "dcat:service": [
            {
              "@type": "dcat:DataService",
              "@id": "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
              "dcat:endpointDescription": "dspace:connector",
              "dcat:endpointURL": "https://cp.localhost/control-plane",
            },
          ],
        });
      })
    );

    server.listen({
      onUnhandledRequest: "warn",
    });

    registryService = module.get(RegistryService);
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
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
        address: "http://localhost",
      });
    });
    it("Retrieve addresses from RegistryWalletClient ready for further use", async () => {
      const addresses = await registryService.fetchFlatAddresses();

      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toEqual("http://localhost");
    });

    it("Get catalogs based on addresses", async () => {
      const addresses = await registryService.fetchAddresses();
      const catalogs = await registryService.getCatalogs(addresses);

      expect(catalogs).toHaveLength(1);
    });

    it("Crawl and retrieve", async () => {
      await registryService.crawl();

      const catalogs = await registryService.getAllCatalogs();
      const output = await Promise.all(
        catalogs.map(async (catalog) => {
          return await catalog.serialize();
        })
      );
      expect(catalogs).toHaveLength(1);
      expect(catalogs[0].dataset).toHaveLength(1);
      expect(catalogs[0].service).toHaveLength(1);
    });
  });
});
