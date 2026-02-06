import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  ServerConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  AgreementDto,
  Catalog,
  CredentialContainer,
  DataService,
  Dataset,
  defaultContext,
  Distribution,
  Multilanguage,
  TransferCompletionMessage,
  TransferProcessDto,
  TransferRequestMessage,
  TransferRequestMessageDto,
  TransferStartMessage,
  TransferState,
  TransferSuspensionMessage,
  TransferTerminationMessage
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
import { AgreementDao, TransferMonitorDao } from "../../model/agreement.dao.js";
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
import { TransferController } from "./transfer.controller.js";
import { TransferService } from "./transfer.service.js";

describe("TransferController", () => {
  let transferController: TransferController;
  let transferService: TransferService;
  let dataPlaneService: DataPlaneService;

  let transferProviderUuid: string;
  let transferConsumerUuid: string;
  let server: SetupServer;
  const remoteProcessId = "urn:uuid:6334612d-bc17-4474-b8c1-5703c7a80bb1";

  beforeAll(async () => {
    server = setupServer(
      http.post(
        "http://127.0.0.1/data-plane/transfers/request/consumer",
        () => {
          return HttpResponse.json({
            accepted: true,
            id: "ABCDEFG",
            callbackAddress:
              "http://127.0.0.1/data-plane/transfers/callbacks/ABCDEFG"
          });
        }
      ),
      http.post(
        "http://127.0.0.1/data-plane/transfers/request/provider",
        () => {
          return HttpResponse.json({
            accepted: true,
            id: "ABCDEFG",
            callbackAddress:
              "http://127.0.0.1/data-plane/transfers/callbacks/ABCDEFG"
          });
        }
      ),
      http.post("http://127.0.0.1/data-plane/transfers/ABCDEFG/:action", () => {
        return HttpResponse.json({
          status: "OK"
        });
      }),
      http.get("http://127.0.0.1/data-plane/health", () =>
        HttpResponse.text("")
      ),
      http.get("http://127.0.0.1/data-plane/catalog", async () =>
        HttpResponse.json(new Catalog({ participantId: "did:web:localhost" }))
      ),
      http.post<PathParams, TransferRequestMessageDto, TransferProcessDto>(
        "http://remoteparty.test/transfers/request",
        async (ctx) => {
          const reqBody = await ctx.request.json();
          return HttpResponse.json<TransferProcessDto>({
            "@context": defaultContext(),
            "@type": "TransferProcess",
            consumerPid: reqBody.consumerPid,
            providerPid: remoteProcessId,
            state: TransferState.REQUESTED
          });
        }
      ),
      http.post<PathParams, TransferRequestMessageDto, TransferProcessDto>(
        "http://127.0.0.1/transfers/request",
        async (ctx) => {
          const reqBody = await ctx.request.json();
          return HttpResponse.json<TransferProcessDto>({
            "@context": defaultContext(),
            "@type": "TransferProcess",
            consumerPid: reqBody.consumerPid,
            providerPid: remoteProcessId,
            state: TransferState.REQUESTED
          });
        }
      ),
      http.post(
        "http://127.0.0.1/callbacks/transfers/:id/:action",
        async () => {
          return HttpResponse.json({
            status: "OK"
          });
        }
      ),
      http.post("http://127.0.0.1/transfers/:id/:action", async () => {
        return HttpResponse.json({
          status: "OK"
        });
      })
    );

    server.listen({
      onUnhandledRequest: "warn"
    });
  });

  afterAll(async () => {
    server.close();
  });

  beforeEach(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const moduleRef: TestingModule = await Test.createTestingModule({
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
          TransferDetailDao,
          AgreementDao,
          TransferMonitorDao
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
          TransferDetailDao,
          AgreementDao,
          TransferMonitorDao
        ])
      ],
      controllers: [TransferController],
      providers: [
        DataPlaneService,
        TransferService,
        CatalogService,
        DspClientService,
        DspGateway,
        AuthClientService,
        {
          provide: AgreementService,
          useValue: {
            async getAgreement(): Promise<AgreementDto> {
              return {
                "@type": "Agreement",
                "@id": "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
                assigner: "did:web:localhost",
                assignee: "did:web:localhost",
                target: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
                timestamp: new Date().toISOString()
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
              verifiableCredentials: CredentialContainer[]
            ) {
              return EvaluationContext.parse({
                role: role,
                scope: scope,
                transferId: transferId,
                localParticipant: "did:web:localhost",
                remoteParticipant: remoteParticipant,
                target: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
                action: action,
                verifiableCredentials: verifiableCredentials,
                evaluationTime: new Date(),
                policy: {
                  agreement: {
                    "@type": "Agreement",
                    "@id": "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
                    assigner: "did:web:localhost",
                    assignee: "did:web:localhost",
                    target: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
                    timestamp: new Date().toISOString()
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
          provide: IamConfig,
          useValue: plainToClass(DevWalletConfig, {
            didId: "did:web:localhost"
          })
        },
        { provide: ServerConfig, useValue: plainToClass(ServerConfig, {}) },
        { provide: RuntimeConfig, useValue: plainToClass(RuntimeConfig, {}) },
        { provide: InitCatalog, useValue: plainToClass(InitCatalog, {}) }
      ]
    })
      .useMocker((token) => {
        if (token === VCAuthService) {
          return {
            requestToken() {
              return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU";
            },
            validateToken() {
              return true;
            }
          };
        }
      })
      .compile();

    transferController = moduleRef.get(TransferController);
    transferService = moduleRef.get(TransferService);
    dataPlaneService = moduleRef.get(DataPlaneService);

    await moduleRef.get(CatalogService).initialized;
    await moduleRef.get(CatalogService).getCatalogDao();

    await dataPlaneService.addDataPlane({
      id: "urn:uuid:b363b656-9f63-4e2b-baab-5376a25bdc0b",
      title: "Test Data Plane",
      dataplaneType: "tsg:HTTP",
      endpointPrefix: "",
      callbackAddress: "http://127.0.0.1/data-plane",
      managementAddress: "http://127.0.0.1/data-plane",
      catalogSynchronization: "push",
      role: "both"
    });
    await dataPlaneService.addDataset(
      "urn:uuid:b363b656-9f63-4e2b-baab-5376a25bdc0b",
      new Dataset({
        id: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
        title: "Test Dataset",
        distribution: [
          new Distribution({
            id: "urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
            format: "tsg:HTTP",
            accessService: new DataService({
              id: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
              endpointURL: "https://httpbin.org/anything"
            })
          })
        ]
      })
    );

    const transferProviderProcess = await transferService.handleRequest(
      new TransferRequestMessage({
        consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
        agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
        format: "tsg:HTTP",
        callbackAddress: "http://127.0.0.1/callbacks"
      }),
      "did:web:localhost",
      []
    );
    transferProviderUuid = transferProviderProcess.providerPid;
    const transferConsumerProcess =
      await transferService.initiateTransferProcess(
        "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
        "http://127.0.0.1/transfers",
        "did:web:localhost",
        "tsg:HTTP"
      );
    transferConsumerUuid = transferConsumerProcess.id;
  });

  afterEach(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("/request", () => {
    it("Contract request should return default contract transfer", async () => {
      const result = await transferController.request(
        new TransferRequestMessage({
          consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
          agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
          format: "tsg:HTTP",
          callbackAddress: "http://127.0.0.1/callbacks"
        }),
        "did:web:localhost",
        []
      );
      expect(result).toStrictEqual<TransferProcessDto>({
        "@context": defaultContext(),
        "@type": "TransferProcess",
        consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
        providerPid: expect.stringContaining("urn:uuid:"),
        state: TransferState.REQUESTED
      });
    });
  });

  describe("/:id", () => {
    it("Transfer request with known id should result the transfer", async () => {
      const result = await transferController.getTransfer(
        transferProviderUuid,
        "did:web:localhost"
      );
      expect(result).toStrictEqual<TransferProcessDto>({
        "@context": defaultContext(),
        "@type": "TransferProcess",
        consumerPid: expect.stringContaining("urn:uuid:"),
        providerPid: transferProviderUuid,
        state: TransferState.REQUESTED
      });
    });
    it("Transfer request with unknown id should result in a 404", async () => {
      await expect(
        transferController.getTransfer(
          "urn:uuid:00000000-0000-0000-0000-000000000000",
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/:id/start", () => {
    it("Transfer start with specified identifier should return a status OK", async () => {
      await transferService.start(transferProviderUuid, undefined, true);
      await transferService.handleSuspend(
        transferProviderUuid,
        new TransferSuspensionMessage({
          consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
          providerPid: transferProviderUuid,
          reason: [new Multilanguage("Test")]
        }),
        "did:web:localhost"
      );
      const result = await transferController.startTransferProcess(
        transferProviderUuid,
        new TransferStartMessage({
          consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
          providerPid: transferProviderUuid
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.startTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferStartMessage({
            consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", async () => {
      await expect(
        transferController.startTransferProcess(
          transferProviderUuid,
          new TransferStartMessage({
            consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
            providerPid: transferProviderUuid
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/completion", () => {
    it("Transfer complete with specified identifier should return a status OK", async () => {
      await transferService.start(transferProviderUuid, undefined, true);

      const result = await transferController.completeTransferProcess(
        transferProviderUuid,
        new TransferCompletionMessage({
          consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
          providerPid: transferProviderUuid
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.completeTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferCompletionMessage({
            consumerPid: "urn:uuid:b7987d7b-85fe-4569-8ef9-965f16e93802",
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", async () => {
      await expect(
        transferController.completeTransferProcess(
          transferProviderUuid,
          new TransferCompletionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/termination", () => {
    it("Transfer terminate with specified identifier should return a status OK", async () => {
      const result = await transferController.terminateTransferProcess(
        transferProviderUuid,
        new TransferTerminationMessage({
          consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
          providerPid: transferProviderUuid,
          code: "123:A",
          reason: [new Multilanguage("Testing")]
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.terminateTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferTerminationMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", async () => {
      await expect(
        transferController.terminateTransferProcess(
          transferProviderUuid,
          new TransferTerminationMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
            code: "123:A",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/suspension", () => {
    it("Transfer suspend with specified identifier should return a status OK", async () => {
      await transferService.start(transferProviderUuid, undefined, true);

      const result = await transferController.suspendTransferProcess(
        transferProviderUuid,
        new TransferSuspensionMessage({
          consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
          providerPid: transferProviderUuid,
          reason: [new Multilanguage("Testing")]
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.suspendTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferSuspensionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", async () => {
      await expect(
        transferController.suspendTransferProcess(
          transferProviderUuid,
          new TransferSuspensionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/callbacks/transfers/:id/start", () => {
    it("Transfer start with specified identifier should return a status OK", async () => {
      const result = await transferController.callbackStartTransferProcess(
        transferConsumerUuid,
        new TransferStartMessage({
          consumerPid: transferConsumerUuid,
          providerPid: remoteProcessId
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.callbackStartTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferStartMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/transfers/:id/completion", () => {
    it("Transfer complete with specified identifier should return a status OK", async () => {
      await transferService.handleStart(
        transferConsumerUuid,
        new TransferStartMessage({
          consumerPid: transferConsumerUuid,
          providerPid: remoteProcessId
        }),
        "did:web:localhost"
      );
      const result = await transferController.callbackCompleteTransferProcess(
        transferConsumerUuid,
        new TransferCompletionMessage({
          consumerPid: transferConsumerUuid,
          providerPid: remoteProcessId
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.callbackCompleteTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferCompletionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/transfers/:id/termination", () => {
    it("Transfer terminate with specified identifier should return a status OK", async () => {
      const result = await transferController.callbackTerminateTransferProcess(
        transferConsumerUuid,
        new TransferTerminationMessage({
          consumerPid: transferConsumerUuid,
          providerPid: remoteProcessId,
          code: "123:A",
          reason: [new Multilanguage("Testing")]
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.callbackTerminateTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferTerminationMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/transfers/:id/suspension", () => {
    it("Transfer suspend with specified identifier should return a status OK", async () => {
      await transferService.handleStart(
        transferConsumerUuid,
        new TransferStartMessage({
          consumerPid: transferConsumerUuid,
          providerPid: remoteProcessId
        }),
        "did:web:localhost"
      );
      const result = await transferController.callbackSuspendTransferProcess(
        transferConsumerUuid,
        new TransferSuspensionMessage({
          consumerPid: transferConsumerUuid,
          providerPid: remoteProcessId,
          reason: [new Multilanguage("Testing")]
        }),
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        status: "OK"
      });
    });
    it("Missing processId in contract request message should result in a 400", async () => {
      await expect(
        transferController.callbackSuspendTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferSuspensionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        )
      ).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
});
