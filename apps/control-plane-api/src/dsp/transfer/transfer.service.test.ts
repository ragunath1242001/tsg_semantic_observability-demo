import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  PaginationOptionsDto,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { DataPlaneRequestResponseDto, DatasetDto } from "@tsg-dsp/common-dsp";
import {
  AgreementDto,
  Catalog,
  DataAddress,
  defaultContext,
  EndpointProperty,
  Multilanguage,
  TransferCompletionMessage,
  TransferProcessDto,
  TransferRequestMessage,
  TransferRequestMessageDto,
  TransferStartMessage,
  TransferState,
  TransferSuspensionMessage,
  TransferTerminationMessage,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import {
  DevWalletConfig,
  IamConfig,
  InitCatalog,
  RuntimeConfig
} from "../../config.js";
import { DataPlaneService } from "../../data-plane/dataPlane.service.js";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../../model/catalog.dao.js";
import { DataPlaneDao } from "../../model/dataPlanes.dao.js";
import {
  TransferDetailDao,
  TransferEventDao
} from "../../model/transfer.dao.js";
import { AgreementService } from "../../policy/agreement.service.js";
import { EvaluationTrigger } from "../../policy/constraint.dto.js";
import {
  EvaluationContext,
  EvaluationDecision
} from "../../policy/evaluation.dto.js";
import { PolicyEvaluationService } from "../../policy/policy.evaluation.service.js";
import { VCAuthService } from "../../vc-auth/vc.auth.service.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { DspClientService } from "../client/client.service.js";
import { DspGateway } from "../client/dsp.gateway.js";
import { TransferService } from "./transfer.service.js";

describe("Transfer service", () => {
  let transferService: TransferService;
  let server: SetupServer;
  const remoteProcessId = "urn:uuid:6334612d-bc17-4474-b8c1-5703c7a80bb1";
  let moduleRef: TestingModule;

  beforeAll(async () => {
    jest.useFakeTimers({ doNotFake: ["Date"] });
    await TypeOrmTestHelper.instance.setupTestDB();
    const iamConfig = plainToClass(DevWalletConfig, {});
    const initCatalog = plainToClass(InitCatalog, {});
    const serverConfig = plainToClass(ServerConfig, {});
    const runtimeConfig = plainToClass(RuntimeConfig, {});
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneDao,
          TransferEventDao,
          TransferDetailDao
        ]),
        TypeOrmModule.forFeature([
          CatalogDao,
          CatalogRecordDao,
          DatasetDao,
          DataServiceDao,
          DistributionDao,
          ResourceDao,
          DataPlaneDao,
          TransferEventDao,
          TransferDetailDao
        ])
      ],
      providers: [
        TransferService,
        DspClientService,
        DspGateway,
        DataPlaneService,
        CatalogService,
        AuthClientService,
        {
          provide: AgreementService,
          useValue: {
            async getAgreement(): Promise<AgreementDto> {
              return {
                "@type": "odrl:Agreement",
                "@id": "urn:uuid:24bcf50a-fb1b-4820-bbad-e015c6b8ab39",
                "odrl:assigner": "did:web:localhost",
                "odrl:assignee": "did:web:localhost",
                "odrl:target": "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                "dspace:timestamp": new Date().toISOString()
              };
            }
          }
        },
        {
          provide: PolicyEvaluationService,
          useValue: {
            async initializeContext(
              _agreementId: string,
              role: "consumer" | "provider",
              scope: EvaluationTrigger,
              transferId: string,
              remoteParticipant: string,
              action: string,
              verifiableCredentials: VerifiableCredential[]
            ) {
              return EvaluationContext.parse({
                role: role,
                scope: scope,
                transferId: transferId,
                localParticipant: "did:web:localhost",
                remoteParticipant: remoteParticipant,
                target: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                action: action,
                verifiableCredentials: verifiableCredentials,
                evaluationTime: new Date(),
                policy: {
                  agreement: {
                    "@type": "odrl:Agreement",
                    "@id": "urn:uuid:24bcf50a-fb1b-4820-bbad-e015c6b8ab39",
                    "odrl:assigner": "did:web:localhost",
                    "odrl:assignee": "did:web:localhost",
                    "odrl:target":
                      "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
                    "dspace:timestamp": new Date().toISOString()
                  }
                }
              });
            },
            async evaluate() {
              return EvaluationDecision.parse({
                decision: "ALLOW",
                permissions: [],
                prohibitions: [],
                obligations: [],
                context: this.context
              });
            }
          }
        },
        {
          provide: AuthConfig,
          useValue: plainToClass(AuthConfig, { enabled: false })
        },
        {
          provide: VCAuthService,
          useValue: new (class {
            async requestToken() {
              return "TEST_TOKEN";
            }
            async validateToken() {
              return true;
            }
          })()
        },
        {
          provide: IamConfig,
          useValue: iamConfig
        },
        {
          provide: InitCatalog,
          useValue: initCatalog
        },
        {
          provide: ServerConfig,
          useValue: serverConfig
        },
        {
          provide: RuntimeConfig,
          useValue: runtimeConfig
        }
      ]
    }).compile();

    let dataPlaneConsumerFirst = true;
    server = setupServer(
      http.get("http://127.0.0.1/data-plane/health", () =>
        HttpResponse.text("")
      ),
      http.get("http://127.0.0.1/data-plane/catalog", async () =>
        HttpResponse.json(await new Catalog({}))
      ),
      http.post<
        PathParams,
        TransferRequestMessageDto,
        DataPlaneRequestResponseDto
      >("http://127.0.0.1/data-plane/transfers/request/consumer", () => {
        if (dataPlaneConsumerFirst) {
          dataPlaneConsumerFirst = false;
          return HttpResponse.json({
            accepted: true,
            identifier: "ABCDEFG",
            callbackAddress:
              "http://127.0.0.1/data-plane/transfers/callbacks/ABCDEFG"
          });
        }
        return HttpResponse.json<DataPlaneRequestResponseDto>({
          accepted: true,
          identifier: "ABCDEFG",
          callbackAddress:
            "http://127.0.0.1/data-plane/transfers/callbacks/ABCDEFG",
          dataAddress: {
            endpoint: `http://localhost/data-plane/push`,
            properties: [
              {
                name: "Authorization",
                value: "Bearer TESTTOKEN"
              }
            ]
          }
        });
      }),
      http.post(
        "http://127.0.0.1/data-plane/transfers/request/provider",
        () => {
          return HttpResponse.json({
            accepted: true,
            identifier: "ABCDEFG",
            callbackAddress:
              "http://127.0.0.1/data-plane/transfers/callbacks/ABCDEFG",
            dataAddress: {
              endpoint: `http://remoteparty.test/data-plane${remoteProcessId}`,
              properties: [
                {
                  name: "Authorization",
                  value: "Bearer TESTTOKEN"
                }
              ]
            }
          });
        }
      ),
      http.post("http://127.0.0.1/data-plane/transfers/ABCDEFG/:action", () => {
        return HttpResponse.json({
          status: "OK"
        });
      }),
      http.get(
        "http://remoteparty.test/catalog/datasets/urn%3Auuid%3A08844168-b568-4eb6-b018-aaf6d9cf0cea",
        () => {
          return HttpResponse.json<DatasetDto>({
            "@context": "https://w3id.org/dspace/2024/1/context.json",
            "@type": "dcat:Dataset",
            "@id": "urn:uuid:test",
            "dcat:distribution": [
              {
                "@type": "dcat:Distribution",
                "@id": "urn:uuid:test",
                "dct:format": "dspace:HTTP"
              }
            ]
          });
        }
      ),
      http.post<PathParams, TransferRequestMessageDto, TransferProcessDto>(
        "http://remoteparty.test/transfers/request",
        async (ctx) => {
          const reqBody = await ctx.request.json();
          return HttpResponse.json<TransferProcessDto>({
            "@context": defaultContext(),
            "@type": "dspace:TransferProcess",
            "dspace:consumerPid": reqBody["dspace:consumerPid"],
            "dspace:providerPid": remoteProcessId,
            "dspace:state": TransferState.REQUESTED,
            "dspace:agreementId": reqBody["dspace:agreementId"]
          });
        }
      ),
      http.post(
        `http://remoteparty.test/transfers/${remoteProcessId}/start`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.post(
        `http://remoteparty.test/transfers/${remoteProcessId}/suspend`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.post(
        `http://remoteparty.test/transfers/${remoteProcessId}/complete`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.post(
        `http://remoteparty.test/transfers/${remoteProcessId}/terminate`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.post("http://remoteparty.test/data-plane/:id", () => {
        return HttpResponse.json({ result: "data" });
      })
    );

    server.listen({ onUnhandledRequest: "warn" });

    transferService = moduleRef.get(TransferService);
    const dataPlaneService = moduleRef.get(DataPlaneService);

    await dataPlaneService.addDataPlane({
      dataplaneType: "dspace:HTTP",
      endpointPrefix: "",
      callbackAddress: "http://127.0.0.1/data-plane",
      managementAddress: "http://127.0.0.1/data-plane",
      managementToken: "DpuwVK9bnX2MVGf6MVVjlBnI4PvtQSGJ",
      catalogSynchronization: "push",
      role: "both"
    });
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
    jest.useRealTimers();
  });

  describe("Consumer interactions", () => {
    let localProcessId: string;
    it("Retrieve initial transfers", async () => {
      const transfers = await transferService.getTransfers(
        new PaginationOptionsDto()
      );
      expect(transfers.total).toBe(0);
    });

    it("Request new transfer", async () => {
      const transferProcess = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test",
        "dspace:HTTP"
      );
      expect(transferProcess).toBeDefined();
      expect(transferProcess.process.providerPid).toBe(remoteProcessId);
      localProcessId = transferProcess.localId;

      const transferProcessPush = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test",
        "dspace:HTTP"
      );
      expect(transferProcessPush).toBeDefined();
      expect(transferProcessPush.process.providerPid).toBe(remoteProcessId);

      const transferDetail = await transferService.getTransfer(
        transferProcessPush.localId
      );
      expect(transferDetail.dataAddress).toBeDefined();
    });
    it("Request new transfer without format", async () => {
      const transferProcess = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test"
      );
      expect(transferProcess).toBeDefined();
      expect(transferProcess.process.providerPid).toBe(remoteProcessId);
      localProcessId = transferProcess.localId;

      const transferProcessPush = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test"
      );
      expect(transferProcessPush).toBeDefined();
      expect(transferProcessPush.process.providerPid).toBe(remoteProcessId);

      const transferDetail = await transferService.getTransfer(
        transferProcessPush.localId
      );
      expect(transferDetail.dataAddress).toBeDefined();
    });
    it("Request new transfer without format and no distributions should fail", async () => {
      server.use(
        http.get(
          "http://remoteparty.test/catalog/datasets/urn%3Auuid%3A08844168-b568-4eb6-b018-aaf6d9cf0cea",
          () => {
            return HttpResponse.json<DatasetDto>({
              "@context": "https://w3id.org/dspace/2024/1/context.json",
              "@type": "dcat:Dataset",
              "@id": "urn:uuid:test",
              "dcat:distribution": []
            });
          }
        )
      );
      await expect(
        transferService.initiateTransferProcess(
          "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
          "http://remoteparty.test/transfers",
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow(
        "Cannot determine format based on dataset, since there are no distributions for this dataset."
      );
    });
    it("Request new transfer without format and multiple distributions should fail", async () => {
      server.use(
        http.get(
          "http://remoteparty.test/catalog/datasets/urn%3Auuid%3A08844168-b568-4eb6-b018-aaf6d9cf0cea",
          () => {
            return HttpResponse.json<DatasetDto>({
              "@context": "https://w3id.org/dspace/2024/1/context.json",
              "@type": "dcat:Dataset",
              "@id": "urn:uuid:test",
              "dcat:distribution": [
                {
                  "@type": "dcat:Distribution",
                  "@id": "urn:uuid:test",
                  "dct:format": "dspace:HTTP"
                },
                {
                  "@type": "dcat:Distribution",
                  "@id": "urn:uuid:test",
                  "dct:format": "dspace:HTTP"
                }
              ]
            });
          }
        )
      );
      await expect(
        transferService.initiateTransferProcess(
          "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
          "http://remoteparty.test/transfers",
          "did:web:remoteparty.test"
        )
      ).rejects.toThrow(
        "Cannot determine format based on dataset, since there are multiple formats in the distributions."
      );
    });

    it("Request new transfer for unknown dataplane should fail", async () => {
      await expect(
        transferService.initiateTransferProcess(
          "urn:uuid:42c1e38d-6069-4111-81c9-edde2ee270b9",
          "http://remoteparty.test/transfers",
          "did:web:remoteparty.test",
          "dspace:HTTP",
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        )
      ).rejects.toThrow("Dataplane for type 'dspace:HTTP' cannot be found");
      const dataPlaneId = (
        await moduleRef
          .get(DataPlaneService)
          .getDataPlanes(PaginationOptionsDto.NO_PAGINATION)
      ).data[0].identifier;
      const transferProcessPush = await transferService.initiateTransferProcess(
        "urn:uuid:3ecd19d6-3cf6-4540-84fa-3ea226230b2f",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test",
        "dspace:HTTP",
        dataPlaneId
      );
      expect(transferProcessPush).toBeDefined();
      expect(transferProcessPush.process.providerPid).toBe(remoteProcessId);

      const transferDetail = await transferService.getTransfer(
        transferProcessPush.localId
      );
      expect(transferDetail.dataAddress).toBeDefined();
    });
    it("Unexpected transition", async () => {
      await expect(
        transferService.suspend(localProcessId, "", true)
      ).rejects.toThrow("cannot transition from");
    });

    it("Retrieve transfer", async () => {
      const transfers = await transferService.getTransfers(
        new PaginationOptionsDto()
      );
      expect(transfers.total).toBe(5);
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail).toBeDefined();
      const transferDetail2 = await transferService.getTransfer(
        localProcessId,
        "did:web:remoteparty.test"
      );
      expect(transferDetail2).toBeDefined();
      await expect(
        transferService.getTransfer(
          localProcessId,
          "did:web:otherremoteparty.test"
        )
      ).rejects.toThrow("Cannot get transfer with process ID");
      await expect(
        transferService.getTransfer(
          "urn:uuid:00000000-0000-0000-0000-000000000000"
        )
      ).rejects.toThrow("Cannot get transfer with process ID");
    });

    it("Handle transfer start", async () => {
      await transferService.handleStart(
        localProcessId,
        new TransferStartMessage({
          providerPid: remoteProcessId,
          consumerPid: localProcessId,
          dataAddress: new DataAddress({
            endpointType: "dspace:HTTP",
            endpoint: `http://remoteparty.test/data-plane/${remoteProcessId}`,
            endpointProperties: [
              new EndpointProperty({
                name: "Authorization",
                value: "Bearer TESTTOKEN"
              })
            ]
          })
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.STARTED);
    });

    it("Suspend transfer", async () => {
      await transferService.suspend(localProcessId, "Test suspending", true);
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.SUSPENDED);
    });
    it("Restart transfer", async () => {
      await transferService.start(localProcessId, undefined, true);
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.STARTED);
    });
    it("Remote suspend", async () => {
      await transferService.handleSuspend(
        localProcessId,
        new TransferSuspensionMessage({
          providerPid: remoteProcessId,
          consumerPid: localProcessId,
          reason: [new Multilanguage("Test suspending")]
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.SUSPENDED);
    });
    it("Handle transfer restart", async () => {
      await transferService.handleStart(
        localProcessId,
        new TransferStartMessage({
          providerPid: remoteProcessId,
          consumerPid: localProcessId,
          dataAddress: new DataAddress({
            endpointType: "dspace:HTTP",
            endpoint: `http://remoteparty.test/data-plane/${remoteProcessId}`,
            endpointProperties: [
              new EndpointProperty({
                name: "Authorization",
                value: "Bearer TESTTOKEN2"
              })
            ]
          })
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.STARTED);
    });
    it("Complete transfer", async () => {
      await transferService.complete(localProcessId, true);
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.COMPLETED);
      expect(transferDetail.events.map((event) => event.state)).toEqual([
        "dspace:REQUESTED",
        "dspace:SUSPENDED",
        "dspace:STARTED",
        "dspace:SUSPENDED",
        "dspace:STARTED",
        "dspace:SUSPENDED",
        "dspace:STARTED",
        "dspace:COMPLETED"
      ]);
    });
  });

  describe("Provider interactions", () => {
    let localProcessId: string;
    it("Handle new transfer request", async () => {
      const handledRequest = await transferService.handleRequest(
        new TransferRequestMessage({
          consumerPid: remoteProcessId,
          agreementId: "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
          format: "dspace:HTTP",
          callbackAddress: `http://remoteparty.test/transfers/${remoteProcessId}`
        }),
        "did:web:remoteparty.test",
        []
      );
      localProcessId = handledRequest.providerPid;
      jest.runAllTimers();
      jest.useRealTimers();
      await new Promise((f) => setTimeout(f, 500));
      const pushTransfer = await transferService.getTransfer(localProcessId);
      expect(pushTransfer.state).toBe(TransferState.STARTED);
    });

    it("Suspend transfer", async () => {
      await transferService.suspend(localProcessId, "Test suspending", true);
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.SUSPENDED);
    });
    it("Restart transfer", async () => {
      await transferService.start(localProcessId, undefined, true);
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.STARTED);
    });
    it("Remote suspend", async () => {
      await transferService.handleSuspend(
        localProcessId,
        new TransferSuspensionMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          reason: [new Multilanguage("Test suspending")]
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.SUSPENDED);
    });
    it("Handle transfer restart", async () => {
      await transferService.handleStart(
        localProcessId,
        new TransferStartMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId,
          dataAddress: new DataAddress({
            endpointType: "dspace:HTTP",
            endpoint: `http://localhost/data-plane/${remoteProcessId}`,
            endpointProperties: [
              new EndpointProperty({
                name: "Authorization",
                value: "Bearer TESTTOKEN2"
              })
            ]
          })
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.STARTED);
    });
    it("Complete transfer", async () => {
      await transferService.handleComplete(
        localProcessId,
        new TransferCompletionMessage({
          providerPid: localProcessId,
          consumerPid: remoteProcessId
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(localProcessId);
      expect(transferDetail.state).toBe(TransferState.COMPLETED);
    });
  });

  describe("Transfer termination", () => {
    it("Remote termination", async () => {
      const transferProcess = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test",
        "dspace:HTTP"
      );
      await transferService.handleTerminate(
        transferProcess.localId,
        new TransferTerminationMessage({
          providerPid: transferProcess.remoteId,
          consumerPid: transferProcess.localId,
          reason: [new Multilanguage("Test termination")],
          code: "PROVIDER_TERMINATION"
        }),
        "did:web:remoteparty.test"
      );
      const transferDetail = await transferService.getTransfer(
        transferProcess.localId
      );
      expect(transferDetail.state).toBe(TransferState.TERMINATED);
    });
    it("Remote termination", async () => {
      const transferProcess = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test",
        "dspace:HTTP"
      );
      await transferService.terminate(
        transferProcess.localId,
        "CONSUMER_TERMINATION",
        "Test termination",
        true
      );
      const transferDetail = await transferService.getTransfer(
        transferProcess.localId
      );
      expect(transferDetail.state).toBe(TransferState.TERMINATED);
    });
  });
});
