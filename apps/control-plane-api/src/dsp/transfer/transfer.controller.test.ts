import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AgreementDto,
  Catalog,
  defaultContext,
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
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { VCAuthService } from "../../vc-auth/vc.auth.service.js";
import { DevWalletConfig, IamConfig, RuntimeConfig } from "../../config.js";
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
import { CatalogService } from "../catalog/catalog.service.js";
import { DspClientService } from "../client/client.service.js";
import { DspGateway } from "../client/dsp.gateway.js";
import { TransferController } from "./transfer.controller.js";
import { TransferService } from "./transfer.service.js";
import { AgreementService } from "../../policy/agreement.service.js";
import { PolicyEvaluationService } from "../../policy/policy.evaluation.service.js";
import { EvaluationTrigger } from "../../policy/constraint.dto.js";
import {
  EvaluationContext,
  EvaluationDecision
} from "../../policy/evaluation.dto.js";
import {
  TypeOrmTestHelper,
  AuthClientService,
  AuthConfig,
  ServerConfig
} from "@tsg-dsp/common-api";
import { AgreementDao, TransferMonitorDao } from "../../model/agreement.dao.js";

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
            identifier: "ABCDEFG",
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
            identifier: "ABCDEFG",
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
        HttpResponse.json(await new Catalog({}))
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
      http.post<PathParams, TransferRequestMessageDto, TransferProcessDto>(
        "http://127.0.0.1/transfers/request",
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
        "http://127.0.0.1/transfers/callbacks/:id/:action",
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
          provide: IamConfig,
          useValue: plainToClass(DevWalletConfig, {
            didId: "did:web:localhost"
          })
        },
        { provide: ServerConfig, useValue: plainToClass(ServerConfig, {}) },
        { provide: RuntimeConfig, useValue: plainToClass(RuntimeConfig, {}) }
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

    await dataPlaneService.addDataPlane({
      dataplaneType: "dspace:HTTP",
      endpointPrefix: "",
      callbackAddress: "http://127.0.0.1/data-plane",
      managementAddress: "http://127.0.0.1/data-plane",
      managementToken: "DpuwVK9bnX2MVGf6MVVjlBnI4PvtQSGJ",
      catalogSynchronization: "push",
      role: "both",
      datasets: [
        {
          "@context": defaultContext(),
          "@type": "dcat:Dataset",
          "@id": "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
          "dct:title": "Test Dataset",
          "dcat:distribution": [
            {
              "@type": "dcat:Distribution",
              "@id": "urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb",
              "dct:format": "dspace:HTTP",
              "dcat:accessService": [
                {
                  "@type": "dcat:DataService",
                  "@id": "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
                  "dcat:endpointURL": "https://httpbin.org/anything"
                }
              ]
            }
          ]
        }
      ]
    });

    const transferProviderProcess = await transferService.handleRequest(
      new TransferRequestMessage({
        consumerPid: "urn:uuid:1c0c61c5-a977-40f0-84ab-eacf2c1e4b4b",
        agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
        format: "dspace:HTTP",
        callbackAddress:
          "http://127.0.0.1/transfers/callbacks/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb"
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
        "dspace:HTTP"
      );
    transferConsumerUuid = transferConsumerProcess.localId;
  });

  afterEach(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("/request", () => {
    it("Contract request should return default contract transfer", async () => {
      const result = await transferController.request(
        new TransferRequestMessage({
          consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
          agreementId: "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099",
          format: "dspace:HTTP",
          callbackAddress:
            "http://127.0.0.1/transfers/callbacks/urn:uuid:de465939-8292-49c1-97d5-bcb643df1fdb"
        }),
        "did:web:localhost",
        { "@context": [], type: [], verifiableCredential: [] }
      );
      expect(result).toStrictEqual({
        "@context": defaultContext(),
        "@type": "dspace:TransferProcess",
        "dspace:consumerPid": "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
        "dspace:providerPid": expect.stringContaining("urn:uuid:"),
        "dspace:state": "dspace:REQUESTED",
        "dspace:agreementId": "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099"
      });
    });
  });

  describe("/:id", () => {
    it("Transfer request with known id should result the transfer", async () => {
      const result = await transferController.getTransfer(
        transferProviderUuid,
        "did:web:localhost"
      );
      expect(result).toStrictEqual({
        "@context": defaultContext(),
        "@type": "dspace:TransferProcess",
        "dspace:consumerPid": expect.stringContaining("urn:uuid:"),
        "dspace:providerPid": transferProviderUuid,
        "dspace:state": "dspace:REQUESTED",
        "dspace:agreementId": "urn:uuid:a1b6d55e-a9ee-4e9c-9a72-ce6e0b1db099"
      });
    });
    it("Transfer request with unknown id should result in a 404", () => {
      expect(async () => {
        await transferController.getTransfer(
          "urn:uuid:00000000-0000-0000-0000-000000000000",
          "did:web:localhost"
        );
      }).rejects.toThrowError(
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.startTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferStartMessage({
            consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.startTransferProcess(
          transferProviderUuid,
          new TransferStartMessage({
            consumerPid: "urn:uuid:9b17c898-5cce-49f9-944b-20488ef55776",
            providerPid: transferProviderUuid
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/complete", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.completeTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferCompletionMessage({
            consumerPid: "urn:uuid:b7987d7b-85fe-4569-8ef9-965f16e93802",
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.completeTransferProcess(
          transferProviderUuid,
          new TransferCompletionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/terminate", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.terminateTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferTerminationMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.terminateTransferProcess(
          transferProviderUuid,
          new TransferTerminationMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
            code: "123:A",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/:id/suspend", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.suspendTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferSuspensionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
    it("Mismatch processId in contract request message and id path parameter should result in a 400", () => {
      expect(async () => {
        await transferController.suspendTransferProcess(
          transferProviderUuid,
          new TransferSuspensionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
      );
    });
  });

  describe("/callbacks/:id/start", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackStartTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferStartMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/:id/complete", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackCompleteTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferCompletionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da"
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/:id/terminate", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackTerminateTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferTerminationMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            code: "123:A",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });

  describe("/callbacks/:id/suspend", () => {
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
    it("Missing processId in contract request message should result in a 400", () => {
      expect(async () => {
        await transferController.callbackSuspendTransferProcess(
          "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
          new TransferSuspensionMessage({
            consumerPid: transferConsumerUuid,
            providerPid: "urn:uuid:741e3479-cdf4-4f1b-b8a5-9d07980725da",
            reason: [new Multilanguage("Testing")]
          }),
          "did:web:localhost"
        );
      }).rejects.toThrowError(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND })
      );
    });
  });
});
