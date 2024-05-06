import { DataPlaneRequestResponseDto } from "@libs/dtos";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Catalog,
  DataAddress,
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
} from "@tsg-dsp/common";
import { plainToClass } from "class-transformer";
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { AuthClientService } from "../../auth/auth.client.service";
import { AuthService } from "../../auth/auth.service";
import {
  AuthConfig,
  DevWalletConfig,
  IamConfig,
  InitCatalog,
  ServerConfig,
} from "../../config";
import { DataPlaneService } from "../../data-plane/dataPlane.service";
import {
  CatalogDao,
  CatalogRecordDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao,
} from "../../model/catalog.dao";
import { DataPlaneDao } from "../../model/dataPlanes.dao";
import { TransferDetailDao, TransferEventDao } from "../../model/transfer.dao";
import { TypeOrmTestHelper } from "../../utils/testhelper";
import { CatalogService } from "../catalog/catalog.service";
import { DspClientService } from "../client/client.service";
import { DspGateway } from "../client/dsp.gateway";
import { TransferService } from "./transfer.service";

describe("Transfer service", () => {
  let transferService: TransferService;
  let dspGateway: DspGateway;
  let server: SetupServer;
  let remoteProcessId = "urn:uuid:6334612d-bc17-4474-b8c1-5703c7a80bb1";

  beforeAll(async () => {
    jest.useFakeTimers({ doNotFake: ["Date"] });
    await TypeOrmTestHelper.instance.setupTestDB();
    const iamConfig = plainToClass(DevWalletConfig, {});
    const initCatalog = plainToClass(InitCatalog, {});
    const serverConfig = plainToClass(ServerConfig, {});
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
        ]),
      ],
      providers: [
        TransferService,
        DspClientService,
        DspGateway,
        DataPlaneService,
        CatalogService,
        AuthClientService,
        {
          provide: AuthConfig,
          useValue: plainToClass(AuthConfig, { enabled: false }),
        },
        {
          provide: AuthService,
          useValue: new (class {
            async requestToken(audience: string) {
              return "TEST_TOKEN";
            }
            async validateToken(token: string, audience?: string) {
              return true;
            }
          })(),
        },
        {
          provide: IamConfig,
          useValue: iamConfig,
        },
        {
          provide: InitCatalog,
          useValue: initCatalog,
        },
        {
          provide: ServerConfig,
          useValue: serverConfig,
        },
      ],
    })
      .overrideProvider(DspGateway)
      .useValue(dspGateway)
      .compile();

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
              "http://127.0.0.1/data-plane/transfers/callbacks/ABCDEFG",
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
                value: "Bearer TESTTOKEN",
              },
            ],
          },
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
                  value: "Bearer TESTTOKEN",
                },
              ],
            },
          });
        }
      ),
      http.post("http://127.0.0.1/data-plane/transfers/ABCDEFG/:action", () => {
        return HttpResponse.json({
          status: "OK",
        });
      }),
      http.post<PathParams, TransferRequestMessageDto, TransferProcessDto>(
        "http://remoteparty.test/transfers/request",
        async (ctx) => {
          const reqBody = await ctx.request.json();
          return HttpResponse.json<TransferProcessDto>({
            "@context": "https://w3id.org/dspace/v0.8/context.json",
            "@type": "dspace:TransferProcess",
            "dspace:consumerPid": reqBody["dspace:consumerPid"],
            "dspace:providerPid": remoteProcessId,
            "dspace:state": TransferState.REQUESTED,
            "dspace:agreementId": reqBody["dspace:agreementId"],
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
      role: "both",
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
      const transfers = await transferService.getTransfers();
      expect(transfers).toHaveLength(0);
    });

    it("Request new transfer", async () => {
      const transferProcess = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "dspace:HTTP",
        undefined,
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test"
      );
      expect(transferProcess).toBeDefined();
      expect(transferProcess.process.providerPid).toBe(remoteProcessId);
      localProcessId = transferProcess.localId;

      const transferProcessPush = await transferService.initiateTransferProcess(
        "urn:uuid:2d9ea8f0-57da-4ea8-8083-bdb8e6782fc9",
        "dspace:HTTP",
        undefined,
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

    it("Unexpected transition", async () => {
      await expect(
        transferService.suspend(localProcessId, "", true)
      ).rejects.toThrow("cannot transition from");
    });

    it("Retrieve transfer", async () => {
      const transfers = await transferService.getTransfers();
      expect(transfers).toHaveLength(2);
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
                value: "Bearer TESTTOKEN",
              }),
            ],
          }),
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
          reason: [new Multilanguage("Test suspending")],
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
                value: "Bearer TESTTOKEN2",
              }),
            ],
          }),
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
          callbackAddress: `http://remoteparty.test/transfers/${remoteProcessId}`,
        }),
        "did:web:remoteparty.test"
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
          reason: [new Multilanguage("Test suspending")],
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
                value: "Bearer TESTTOKEN2",
              }),
            ],
          }),
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
          consumerPid: remoteProcessId,
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
        "dspace:HTTP",
        undefined,
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test"
      );
      await transferService.handleTerminate(
        transferProcess.localId,
        new TransferTerminationMessage({
          providerPid: transferProcess.remoteId,
          consumerPid: transferProcess.localId,
          reason: [new Multilanguage("Test termination")],
          code: "PROVIDER_TERMINATION",
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
        "dspace:HTTP",
        undefined,
        "http://remoteparty.test/transfers",
        "did:web:remoteparty.test"
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
