import { HttpStatus, RawBodyRequest } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AppLogger,
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ControlPlaneConfig,
  createDataPlaneHttpMocks,
  createDataPlaneManagementHttpMocks,
  createDidConnectorHttpMocks,
  DataPlaneRegistrationService,
  DataPlaneStateDao,
  ITransferHandler,
  NegotiationClientService,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import {
  ContractNegotiationState,
  NegotiationRole,
  TransferProcessDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import { NegotiationDetailDto } from "@tsg-dsp/common-dtos";
import { plainToClass } from "class-transformer";
import { Request, Response } from "express";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { Writable } from "stream";
import { Mock, MockedObject, vi } from "vitest";

import { LoggingConfig, RootConfig } from "../config.js";
import {
  DatasetItemDao,
  HttpDatasetConfigDao,
  VersionedDatasetDao
} from "../dataplane/dataplane.dao.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
import { HTTPTransferHandler } from "./http-transfer-handler.service.js";
import { TransferDao } from "./transfer.dao.js";

// Vitest-compatible mock for Express Response that supports piping
function getMockRes() {
  const writtenData: Buffer[] = [];
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      writtenData.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    }
  });

  const res = Object.assign(writable, {
    status: vi.fn().mockReturnValue(writable),
    send: vi.fn().mockReturnValue(writable),
    json: vi.fn().mockReturnValue(writable),
    write: vi.fn((data: any) => {
      writtenData.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      return true;
    }),
    end: vi.fn().mockReturnValue(writable),
    setHeader: vi.fn().mockReturnValue(writable),
    getHeader: vi.fn(),
    getHeaders: vi.fn().mockReturnValue({}),
    removeHeader: vi.fn().mockReturnValue(writable),
    header: vi.fn().mockReturnValue(writable),
    set: vi.fn().mockReturnValue(writable),
    type: vi.fn().mockReturnValue(writable),
    contentType: vi.fn().mockReturnValue(writable),
    redirect: vi.fn().mockReturnValue(writable),
    render: vi.fn().mockReturnValue(writable),
    locals: {},
    headersSent: false,
    statusCode: 200
  }) as unknown as MockedObject<Response>;

  return { res, getWrittenData: () => Buffer.concat(writtenData) };
}

describe.each(["Authorization"])(
  //, "X-TSG-Authorization"])(
  "Transfer Service (%s)",
  (authorizationHeaderConfig) => {
    let transferService: HTTPTransferHandler;
    let moduleRef: TestingModule;
    let server: SetupServer;

    beforeAll(async () => {
      await TypeOrmTestHelper.instance.setupTestDB();
      const config = plainToClass(RootConfig, {
        server: {},
        controlPlane: {
          dataPlaneEndpoint: "http://127.0.0.1/data-plane",
          managementEndpoint: "http://localhost:3000/management",
          controlEndpoint: "http://localhost:3000",
          authorization: "Basic YWRtaW46YWRtaW4=",
          initializationDelay: 1
        },
        dataset: {
          type: "versioned",
          id: `urn:uuid:test`,
          title: "HTTPBin",
          versions: [
            {
              version: "0.9.2",
              authorization: "Bearer AAAAAAA",
              distributions: [
                {
                  mediaType: "http/json",
                  backendUrl: "https://httpbin.org/anything" // This URL returns anything that is passed in the request data.
                } //  The testcases expect this, so keep this url as backend.
              ]
            }
          ]
        },
        logging: {
          debug: true
        },
        authorizationHeader: authorizationHeaderConfig
      });

      server = setupServer(
        ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint),
        ...createDataPlaneManagementHttpMocks(
          config.controlPlane.managementEndpoint
        ),
        ...createDidConnectorHttpMocks(),
        http.post("https://httpbin.org/anything/anything/test", () => {
          return HttpResponse.json({
            args: {
              filter: "filterQueryString"
            },
            data: '{"test":"test2"}',
            files: {},
            form: {},
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip, compress, deflate, br",
              "Content-Length": "16",
              "Content-Type": "application/json",
              Host: "httpbin.org",
              "User-Agent": "axios/1.5.0",
              "X-Amzn-Trace-Id": "Root=1-6571e4ca-792829da6e6bcb6115862d0b"
            },
            json: {
              test: "test2"
            },
            method: "POST",
            origin: "0.0.0.0",
            url: "https://httpbin.org/anything/anything/test"
          });
        }),
        http.post("http://your-api-url/negotiations/request", ({ request }) => {
          if (request.url.includes("validDatasetId")) {
            return HttpResponse.json(HttpStatus.OK); // successful response
          } else {
            return HttpResponse.json(HttpStatus.NOT_FOUND); // simulate failure for invalid datasets
          }
        }),
        http.post(
          "http://localhost:3000/management/negotiations/request",
          () => {
            return HttpResponse.json({
              "@type": "ContractNegotiation",
              "@id": "urn:uuid:1234",
              providerPid: "providerPid",
              consumerPid: "consumerPid",
              state: "REQUESTED"
            });
          }
        )
      );

      server.listen({ onUnhandledRequest: "error" });

      moduleRef = await Test.createTestingModule({
        imports: [
          TypeOrmTestHelper.instance.module([
            TransferDao,
            HttpDatasetConfigDao,
            VersionedDatasetDao,
            DatasetItemDao,
            IngressLogDao,
            EgressLogDao,
            DataPlaneStateDao
          ]),
          TypeOrmModule.forFeature([
            TransferDao,
            HttpDatasetConfigDao,
            VersionedDatasetDao,
            DatasetItemDao,
            IngressLogDao,
            EgressLogDao,
            DataPlaneStateDao
          ])
        ],
        controllers: [],
        providers: [
          DataPlaneService,
          LoggingService,
          AuthClientService,
          DataPlaneRegistrationService,
          CatalogClientService,
          NegotiationClientService,
          TransferClientService,
          {
            provide: AuthConfig,
            useValue: { enabled: false }
          },
          {
            provide: LoggingConfig,
            useValue: { debug: true }
          },
          {
            provide: RootConfig,
            useValue: config
          },
          {
            provide: ControlPlaneConfig,
            useValue: config.controlPlane
          },
          {
            provide: ITransferHandler,
            useClass: HTTPTransferHandler
          }
        ]
      })
        .setLogger(new AppLogger())
        .compile();

      await moduleRef.init();

      transferService = moduleRef.get(ITransferHandler);
      await moduleRef.get(DataPlaneService).initialized;

      await new Promise((r) => setTimeout(r, 20));
    });

    afterEach(async () => {
      vi.restoreAllMocks();
    });
    afterAll(() => {
      TypeOrmTestHelper.instance.teardownTestDB();
      server.close();
    });

    describe("Provider process", () => {
      let transferProcessId = "urn:uuid:4904fd10-05c0-40fe-99f8-ce4a7d336c4f";
      let authorization = "";

      const request = (
        authorization: string,
        authorizationHeader: string = authorizationHeaderConfig
      ) =>
        ({
          method: "POST",
          path: "/0.9.2/anything/test",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            [authorizationHeader.toLowerCase()]: authorization
          },
          query: {
            filter: "filterQueryString"
          } as qs.ParsedQs,
          body: {
            test: "test2"
          },
          rawBody: Buffer.from(JSON.stringify({ test: "test2" }), "utf-8")
        }) as RawBodyRequest<Request>;

      it("Transfer request", async () => {
        const result = await transferService.handleTransferRequest(
          {
            "@type": "TransferRequestMessage",
            agreementId: "urn:uuid:cadb401e-4275-4d77-99a2-5aa2af93e3b7",
            format: "tsg:HTTP",
            callbackAddress: "http://127.0.0.1/test",
            consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
          },
          "provider",
          transferProcessId,
          "did:web:localhost",
          "urn:uuid:test"
        );
        transferProcessId = result.identifier;
        authorization =
          result.dataAddress?.properties?.find(
            ({ name }: { name: string }) => name === authorizationHeaderConfig
          )?.value || "UNKNOWN";
        expect(result.dataAddress).toBeDefined();
      });

      it("Get transfers for transport", async () => {
        const transfers = await transferService.getTransfers();
        expect(transfers).toHaveLength(1);

        const existingTransfer = await transferService.getTransferById(
          transfers[0].id
        );
        expect(existingTransfer).toBeDefined();

        await expect(
          transferService.getTransferById("unknown")
        ).rejects.toThrow("not found");
      });

      it("Transfer execution on requested", async () => {
        const response = getMockRes();
        await expect(
          transferService.handleProxyRequest(
            transferProcessId,
            "anything/test",
            request(authorization),
            response.res as unknown as Response
          )
        ).rejects.toThrow("accessing is not allowed");
      });

      it("Transfer start", async () => {
        await transferService.handleTransferStart(
          {
            "@type": "TransferStartMessage",
            providerPid: transferProcessId,
            consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
          },
          transferProcessId
        );
      });

      it("Transfer execution", async () => {
        const response = getMockRes();
        await transferService.handleProxyRequest(
          transferProcessId,
          "anything/test",
          request(authorization),
          response.res as unknown as Response
        );

        await new Promise((r) => setTimeout(r, 50));

        const resultBody = JSON.parse(
          Buffer.from(
            (response.res.write as Mock).mock.calls[0][0] as any
          ).toString()
        );

        expect(resultBody["json"]["test"]).toBe("test2");
        expect(resultBody["headers"]["Content-Type"]).toBe("application/json");
        expect(resultBody["headers"]["Accept"]).toBe("application/json");
        expect(resultBody["args"]["filter"]).toBe("filterQueryString");
        expect((response.res.status as Mock).mock.calls[0][0]).toBe(200);
      });

      it("Transfer execution without authorization", async () => {
        const response = getMockRes();
        await expect(
          transferService.handleProxyRequest(
            transferProcessId,
            "anything/test",
            request("UNKNOWN"),
            response.res as unknown as Response
          )
        ).rejects.toThrow("Incorrect authorization header");
      });

      it("Transfer execution on unknown transfer", async () => {
        const response = getMockRes();
        await expect(
          transferService.handleProxyRequest(
            "urn:uuid:00000000-0000-0000-0000-000000000000",
            "anything/test",
            request("UNKNOWN"),
            response.res as unknown as Response
          )
        ).rejects.toThrow("not found");
      });

      it("Transfer completion", async () => {
        await transferService.handleTransferComplete(
          {
            "@type": "TransferCompletionMessage",
            providerPid: transferProcessId,
            consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
          },
          transferProcessId
        );
      });

      it("Transfer execution on completed", async () => {
        const response = getMockRes();
        await expect(
          transferService.handleProxyRequest(
            transferProcessId,
            "anything/test",
            request(authorization),
            response.res as unknown as Response
          )
        ).rejects.toThrow("accessing is not allowed");
      });

      it("Request metadata", async () => {
        const metadata = await transferService.getMetadata(transferProcessId);
        expect(metadata.agreement).toBeDefined();
        expect(metadata.dataset).toBeDefined();
      });

      it("Start transfer", async () => {
        const response = await moduleRef
          .get(TransferClientService)
          .transferStart({ processId: transferProcessId, id: "dummy" });
        expect(response).toStrictEqual({ status: "OK" });
      });

      it("Complete transfer", async () => {
        const response = await moduleRef
          .get(TransferClientService)
          .transferComplete({ processId: transferProcessId, id: "dummy" });
        expect(response).toStrictEqual({ status: "OK" });
      });

      it("Terminate transfer", async () => {
        const response = await moduleRef
          .get(TransferClientService)
          .transferTerminate(
            { processId: transferProcessId, id: "dummy" },
            "CODE",
            "REASON"
          );
        expect(response).toStrictEqual({ status: "OK" });
      });

      it("Suspend transfer", async () => {
        const response = await moduleRef
          .get(TransferClientService)
          .transferSuspend(
            { processId: transferProcessId, id: "dummy" },
            "REASON"
          );
        expect(response).toStrictEqual({ status: "OK" });
      });
    });

    describe("Consumer process", () => {
      let transferProcessId = "urn:uuid:dab7264b-7ff4-4182-9e89-6238a57b5006";
      const request = {
        method: "POST",
        path: "/anything/test",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        query: {
          filter: "filterQueryString"
        } as qs.ParsedQs,
        body: {
          test: "test2"
        },
        rawBody: Buffer.from(JSON.stringify({ test: "test2" }), "utf-8")
      } as RawBodyRequest<Request>;

      it("Transfer Request", async () => {
        const result = await transferService.handleTransferRequest(
          {
            "@type": "TransferRequestMessage",
            consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
            agreementId: "urn:uuid:e785d4a8-2030-4a2b-b223-9881e35c0df7",
            format: "tsg:HTTP",
            callbackAddress: "http://127.0.0.1/test"
          },
          "consumer",
          transferProcessId,
          "did:web:localhost",
          "urn:uuid:test"
        );
        transferProcessId = result.identifier;
      });

      it("Transfer execution on requested", async () => {
        const response = getMockRes();
        await expect(
          transferService.executeProxyRequest(
            transferProcessId,
            "anything/test",
            request,
            response.res as unknown as Response
          )
        ).rejects.toThrow("accessing is not allowed");
      });

      it("Transfer start", async () => {
        await transferService.handleTransferStart(
          {
            "@type": "TransferStartMessage",
            providerPid: transferProcessId,
            consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000",
            dataAddress: {
              "@type": "DataAddress",
              endpoint: "https://httpbin.org/anything",
              endpointType: "tsg:HTTP",
              endpointProperties: [
                {
                  "@type": "EndpointProperty",
                  name: authorizationHeaderConfig,
                  value: "Bearer ABCDEF"
                }
              ]
            }
          },
          transferProcessId
        );
      });

      it("Transfer execution", async () => {
        const mockedResponse = getMockRes().res as unknown as MockedObject<
          Response<any, Record<string, any>>
        >;
        await transferService.executeProxyRequest(
          transferProcessId,
          "anything/test",
          request,
          mockedResponse as unknown as Response
        );
        await new Promise((r) => setTimeout(r, 10));

        expect(mockedResponse.write).toHaveBeenCalledTimes(1);
        const resultBody = JSON.parse(
          Buffer.from(mockedResponse.write.mock.lastCall![0]).toString()
        );
        expect(resultBody["json"]["test"]).toBe("test2");
        expect(resultBody["headers"]["Content-Type"]).toBe("application/json");
        expect(resultBody["headers"]["Accept"]).toBe("application/json");
        expect(resultBody["args"]["filter"]).toBe("filterQueryString");
        expect(mockedResponse.status).toHaveBeenLastCalledWith(200);
      });

      it("Transfer execution on unknown transfer", async () => {
        const response = getMockRes();
        await expect(
          transferService.executeProxyRequest(
            "urn:uuid:00000000-0000-0000-0000-000000000000",
            "anything/test",
            request,
            response.res as unknown as Response
          )
        ).rejects.toThrow("not found");
      });

      it("Transfer completion", async () => {
        await transferService.handleTransferComplete(
          {
            "@type": "TransferCompletionMessage",
            providerPid: transferProcessId,
            consumerPid: "urn:uuid:00000000-0000-0000-0000-000000000000"
          },
          transferProcessId
        );
      });

      it("Transfer execution on completed", async () => {
        const response = getMockRes();
        await expect(
          transferService.executeProxyRequest(
            transferProcessId,
            "anything/test",
            request,
            response.res as unknown as Response
          )
        ).rejects.toThrow("accessing is not allowed");
      });
    });
    describe("determineTransferId", () => {
      let datasetId: string;
      let audience: string;
      let controlPlaneAddress: string | undefined;

      beforeEach(() => {
        datasetId = "urn:uuid:test-dataset";
        audience = "did:web:test-audience";
        controlPlaneAddress = "test-address";
      });

      it("should return transfer ID if an active transfer is found", async () => {
        const transfer = {
          id: "urn:uuid:transfer-id",
          datasetId: datasetId,
          state: TransferState.STARTED,
          createdDate: new Date()
        } as TransferDao;

        vi.spyOn(
          transferService.transferRepository,
          "findOne"
        ).mockResolvedValueOnce(transfer);

        const result = await transferService.determineTransferId(
          datasetId,
          audience,
          controlPlaneAddress
        );

        expect(result).toBe(transfer.id);
      });

      it("should request a new negotiation and transfer if no active transfer is found", async () => {
        vi.spyOn(
          transferService.transferRepository,
          "findOne"
        ).mockResolvedValueOnce(null);

        const negotiation = {
          localId: "test",
          remoteId: "test",
          events: [],
          remoteParty: "did:web:test",
          remoteAddress: "remoteAddress",
          dataSet: "urn:uuid:1234",
          modifiedDate: new Date(),
          role: "provider" as NegotiationRole,
          state: ContractNegotiationState.FINALIZED,
          agreement: {
            "@type": "Agreement",
            "@id": "urn:uuid:agreement-id",
            assignee: "did:web:localhost",
            assigner: "did:web:localhost",
            target: datasetId,
            timestamp: new Date().toISOString()
          }
        } as NegotiationDetailDto;
        const negotiationClient = moduleRef.get(NegotiationClientService);
        const transferClient = moduleRef.get(TransferClientService);
        vi.spyOn(
          negotiationClient,
          "getNegotiationForDataset"
        ).mockRejectedValueOnce(new Error("Not found"));
        vi.spyOn(
          negotiationClient,
          "requestDefaultNegotiation"
        ).mockResolvedValueOnce(negotiation);

        vi.spyOn(transferClient, "requestTransfer").mockResolvedValueOnce(
          {} as TransferProcessDto
        );

        const transfer = {
          id: "urn:uuid:transfer-id",
          datasetId: datasetId,
          state: TransferState.STARTED,
          createdDate: new Date()
        } as TransferDao;

        vi.spyOn(
          transferService,
          "getStartedTransferWithBackoff"
        ).mockResolvedValueOnce(transfer);

        const result = await transferService.determineTransferId(
          datasetId,
          audience,
          controlPlaneAddress
        );

        expect(result).toBe(transfer.id);
        expect(
          negotiationClient.requestDefaultNegotiation
        ).toHaveBeenCalledWith(
          datasetId,
          audience,
          expect.any(String),
          expect.any(Function)
        );
        expect(transferClient.requestTransfer).toHaveBeenCalledWith(
          negotiation.agreement!["@id"],
          audience,
          expect.any(String)
        );
      });

      it("should throw an error if no transfer is found after retries", async () => {
        vi.spyOn(
          transferService.transferRepository,
          "findOne"
        ).mockResolvedValueOnce(null);

        const negotiation = {
          localId: "test",
          remoteId: "test",
          events: [],
          remoteParty: "did:web:test",
          remoteAddress: "remoteAddress",
          dataSet: "urn:uuid:1234",
          modifiedDate: new Date(),
          role: "provider" as NegotiationRole,
          state: ContractNegotiationState.FINALIZED,
          agreement: {
            "@type": "Agreement",
            "@id": "urn:uuid:agreement-id",
            assignee: "did:web:localhost",
            assigner: "did:web:localhost",
            target: datasetId,
            timestamp: new Date().toISOString()
          }
        } as NegotiationDetailDto;
        const negotiationClient = moduleRef.get(NegotiationClientService);
        const transferClient = moduleRef.get(TransferClientService);
        vi.spyOn(
          negotiationClient,
          "getNegotiationForDataset"
        ).mockRejectedValue(new Error("Not found"));
        vi.spyOn(
          negotiationClient,
          "requestDefaultNegotiation"
        ).mockResolvedValue(negotiation);

        vi.spyOn(transferClient, "requestTransfer").mockResolvedValue(
          {} as TransferProcessDto
        );

        vi.spyOn(
          transferService["transferRepository"],
          "findOne"
        ).mockResolvedValue(null);
        vi.spyOn(
          transferService,
          "getStartedTransferWithBackoff"
        ).mockRejectedValueOnce(
          new Error(`Failed to find transfer for dataset ${datasetId}`)
        );

        await expect(
          transferService.determineTransferId(
            datasetId,
            audience,
            controlPlaneAddress
          )
        ).rejects.toThrow(`Failed to find transfer for dataset ${datasetId}`);
      });

      it("should handle errors during negotiation request", async () => {
        vi.spyOn(
          transferService.transferRepository,
          "findOne"
        ).mockResolvedValueOnce(null);

        const negotiationClient = moduleRef.get(NegotiationClientService);
        vi.spyOn(
          negotiationClient,
          "getNegotiationForDataset"
        ).mockRejectedValueOnce(new Error("Negotiation error A"));
        vi.spyOn(
          negotiationClient,
          "requestDefaultNegotiation"
        ).mockRejectedValueOnce(new Error("Negotiation error B"));

        await expect(
          transferService.determineTransferId(
            datasetId,
            audience,
            controlPlaneAddress
          )
        ).rejects.toThrow("Negotiation error");
      });
    });
    describe("retryFindTransfer", () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("should return transfer if found within max retries", async () => {
        const datasetId = "urn:uuid:test-datasetjee";
        const transfer = {
          id: "urn:uuid:transfer-id",
          datasetId: datasetId,
          state: TransferState.STARTED,
          createdDate: new Date()
        } as TransferDao;

        vi.spyOn(
          transferService.transferRepository,
          "findOne"
        ).mockResolvedValueOnce(transfer);

        const result = await transferService.getStartedTransferWithBackoff(
          datasetId,
          3,
          1
        );

        expect(result).toBe(transfer);
        expect(
          transferService.transferRepository.findOne
        ).toHaveBeenCalledTimes(1);
      });

      it("should throw if transfer is not found after max retries", async () => {
        const datasetId = "urn:uuid:test-dataset";

        vi.spyOn(
          transferService.transferRepository,
          "findOne"
        ).mockResolvedValueOnce(null);

        await expect(
          transferService.getStartedTransferWithBackoff(datasetId, 3, 1)
        ).rejects.toThrow(`Failed to find transfer for dataset ${datasetId}`);

        expect(
          transferService.transferRepository.findOne
        ).toHaveBeenCalledTimes(3);
      });
    });
  }
);
