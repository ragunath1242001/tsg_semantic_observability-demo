import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { plainToClass } from "class-transformer";
import { LoggingConfig, RootConfig } from "../config.js";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import { Request, Response } from "express";
import { getMockRes } from "@jest-mock/express";
import {
  AgreementDto,
  DataPlaneCreation,
  DatasetDto,
  NegotiationRole,
  ContractNegotiationState,
  TransferState
} from "@tsg-dsp/common-dsp";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpStatus, RawBodyRequest } from "@nestjs/common";
import { EgressLogDao, IngressLogDao } from "../logging/logging.dao.js";
import { LoggingService } from "../logging/logging.service.js";
import { NegotiationDetailDto } from "@tsg-dsp/common-dtos";
import {
  TypeOrmTestHelper,
  AuthClientService,
  AuthConfig
} from "@tsg-dsp/common-api";
import { TransferService } from "./transfer.service.js";
import {
  DataPlaneStateDao,
  DatasetItemDao
} from "../dataplane/dataplane.dao.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { TransferDao } from "./transfer.dao.js";

describe("Transfer Service", () => {
  let transferService: TransferService;
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
      }
    });

    server = setupServer(
      http.post<PathParams, DataPlaneCreation>(
        `${config.controlPlane.dataPlaneEndpoint}/init`,
        async ({ request }) => {
          const requestBody = await request.json();
          return HttpResponse.json({
            ...requestBody,
            identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9"
          });
        }
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/catalog`,
        ({ request }) => {
          return HttpResponse.json(request.json());
        }
      ),
      http.post(
        `${config.controlPlane.managementEndpoint}/transfers/:processId/:action`,
        () => {
          return HttpResponse.json({ status: "OK" });
        }
      ),
      http.get(
        `${config.controlPlane.managementEndpoint}/agreements/:agreementId`,
        () => {
          return HttpResponse.json<AgreementDto>({
            "@context": "https://w3id.org/dspace/2024/1/context.json",
            "@type": "odrl:Agreement",
            "@id": "urn:uuid:test",
            "odrl:assigner": "did:web:localhost",
            "odrl:assignee": "did:web:localhost",
            "dspace:timestamp": new Date().toISOString(),
            "odrl:target": "urn:uuid:dataset"
          });
        }
      ),
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json({
          service: [
            {
              type: "connector",
              serviceEndpoint: "http://remotecontrolplane/"
            }
          ]
        });
      }),
      http.get(
        `${config.controlPlane.managementEndpoint}/catalog/dataset`,
        () => {
          return HttpResponse.json<DatasetDto>({
            "@context": "https://w3id.org/dspace/2024/1/context.json",
            "@type": "dcat:Dataset",
            "@id": "urn:uuid:test"
          });
        }
      ),
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
      http.get("https://testaudience/.well-known/did.json", () => {
        return HttpResponse.json({
          service: [
            {
              type: "connector",
              serviceEndpoint: "http://remotecontrolplane/"
            }
          ]
        });
      }),
      http.post("http://localhost:3000/management/negotiations/request", () => {
        return HttpResponse.json({
          "@type": "dspace:ContractNegotiation",
          "@id": "urn:uuid:1234",
          "dspace:providerPid": "providerPid",
          "dspace:consumerPid": "consumerPid",
          "dspace:state": "dspace:REQUESTED"
        });
      }),
      http.post(
        "http://localhost:3000/management/negotiations/dataset/:dataset",
        () => {
          return HttpResponse.json([
            {
              "@type": "dspace:ContractNegotiation",
              "@id": "urn:uuid:1234",
              "dspace:providerPid": "providerPid",
              "dspace:consumerPid": "consumerPid",
              "dspace:state": "dspace:REQUESTED"
            }
          ]);
        }
      ),
      http.get("http://localhost:3000/management/request", () => {
        return HttpResponse.json({});
      })
    );

    server.listen({ onUnhandledRequest: "warn" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          DataPlaneStateDao,
          DatasetItemDao,
          IngressLogDao,
          EgressLogDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          DataPlaneStateDao,
          DatasetItemDao,
          IngressLogDao,
          EgressLogDao
        ])
      ],
      controllers: [],
      providers: [
        DataPlaneService,
        TransferService,
        LoggingService,
        AuthClientService,
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
        }
      ]
    }).compile();

    transferService = moduleRef.get(TransferService);
    await moduleRef.get(DataPlaneService).initialized;

    await new Promise((r) => setTimeout(r, 20));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Provider process", () => {
    let transferProcessId = "urn:uuid:4904fd10-05c0-40fe-99f8-ce4a7d336c4f";
    let authorization = "";

    const request = {
      method: "POST",
      path: "/0.9.2/anything/test",
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

    it("Transfer request", async () => {
      const result = await transferService.handleTransferRequest(
        {
          "@type": "dspace:TransferRequestMessage",
          "dspace:agreementId": "urn:uuid:cadb401e-4275-4d77-99a2-5aa2af93e3b7",
          "dct:format": "dspace:HTTP",
          "dspace:callbackAddress": "http://127.0.0.1/test",
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        "provider",
        transferProcessId,
        "did:web:localhost",
        "urn:uuid:test"
      );
      transferProcessId = result.identifier;
      authorization =
        result.dataAddress?.properties?.find(
          ({ name }) => name === "Authorization"
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

      await expect(transferService.getTransferById("unknown")).rejects.toThrow(
        "not found"
      );
    });

    it("Transfer execution on requested", async () => {
      const response = getMockRes();
      await expect(
        transferService.handleProxyRequest(
          transferProcessId,
          authorization,
          "anything/test",
          request,
          response.res as unknown as Response
        )
      ).rejects.toThrow("accessing is not allowed");
    });

    it("Transfer start", async () => {
      await transferService.handleTransferStart(
        {
          "@type": "dspace:TransferStartMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Transfer execution", async () => {
      const response = getMockRes();
      await transferService.handleProxyRequest(
        transferProcessId,
        authorization,
        "anything/test",
        request,
        response.res as unknown as Response
      );

      await new Promise((r) => setTimeout(r, 50));

      const resultBody = JSON.parse(
        Buffer.from(
          (response.res.write as jest.Mock).mock.calls[0][0] as any
        ).toString()
      );

      expect(resultBody["json"]["test"]).toBe("test2");
      expect(resultBody["headers"]["Content-Type"]).toBe("application/json");
      expect(resultBody["headers"]["Accept"]).toBe("application/json");
      expect(resultBody["args"]["filter"]).toBe("filterQueryString");
      expect((response.res.status as jest.Mock).mock.calls[0][0]).toBe(200);
    });

    it("Transfer execution without authorization", async () => {
      const response = getMockRes();
      await expect(
        transferService.handleProxyRequest(
          transferProcessId,
          "UNKNOWN",
          "anything/test",
          request,
          response.res as unknown as Response
        )
      ).rejects.toThrow("Incorrect authorization header");
    });

    it("Transfer execution on unknown transfer", async () => {
      const response = getMockRes();
      await expect(
        transferService.handleProxyRequest(
          "urn:uuid:00000000-0000-0000-0000-000000000000",
          "UNKNOWN",
          "anything/test",
          request,
          response.res as unknown as Response
        )
      ).rejects.toThrow("not found");
    });

    it("Transfer completion", async () => {
      await transferService.handleTransferComplete(
        {
          "@type": "dspace:TransferCompletionMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
        },
        transferProcessId
      );
    });

    it("Transfer execution on completed", async () => {
      const response = getMockRes();
      await expect(
        transferService.handleProxyRequest(
          transferProcessId,
          authorization,
          "anything/test",
          request,
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
      const response = await transferService.transferStart(transferProcessId);
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Complete transfer", async () => {
      const response =
        await transferService.transferComplete(transferProcessId);
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Terminate transfer", async () => {
      const response = await transferService.transferTerminate(
        transferProcessId,
        "CODE",
        "REASON"
      );
      expect(response).toStrictEqual({ status: "OK" });
    });

    it("Suspend transfer", async () => {
      const response = await transferService.transferSuspend(
        transferProcessId,
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
          "@type": "dspace:TransferRequestMessage",
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
          "dspace:agreementId": "urn:uuid:e785d4a8-2030-4a2b-b223-9881e35c0df7",
          "dct:format": "dspace:HTTP",
          "dspace:callbackAddress": "http://127.0.0.1/test"
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
          "@type": "dspace:TransferStartMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
          "dspace:dataAddress": {
            "@type": "dspace:DataAddress",
            "dspace:endpoint": "https://httpbin.org/anything",
            "dspace:endpointType": "dspace:HTTP",
            "dspace:endpointProperties": [
              {
                "@type": "dspace:EndpointProperty",
                "dspace:name": "Authorization",
                "dspace:value": "Bearer ABCDEF"
              }
            ]
          }
        },
        transferProcessId
      );
    });

    it("Transfer execution", async () => {
      const mockedResponse = getMockRes().res as unknown as jest.MockedObject<
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
          "@type": "dspace:TransferCompletionMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000"
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
  describe("getNegotiationWithBackoff", () => {
    it("should return negotiation when finalized", async () => {
      const negotiationId = "test-id";
      const negotiation = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: ContractNegotiationState.FINALIZED
      };
      jest
        .spyOn(transferService, "checkForFinalizedNegotiation")
        .mockResolvedValue(negotiation);

      const result =
        await transferService.getNegotiationWithBackoff(negotiationId);

      expect(result).toEqual(negotiation);
    });

    it("should throw an error after max retries", async () => {
      const negotiationId = "test-id";
      jest
        .spyOn(transferService, "checkForFinalizedNegotiation")
        .mockResolvedValue(undefined);

      await expect(
        transferService.getNegotiationWithBackoff(negotiationId, 5, 1)
      ).rejects.toThrow(
        `Negotiation ${negotiationId} did not finalize after 5 retries`
      );
    });
  });

  describe("obtainNegotiation", () => {
    it("should request a new negotiation", async () => {
      const datasetId = "dataset-id";
      const address = "address";
      const audience = "audience";
      const dataset: DatasetDto = { "odrl:hasPolicy": [{}] } as DatasetDto;

      jest.spyOn(transferService, "getDataset").mockResolvedValue(dataset);

      const negotiation: NegotiationDetailDto = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:uuid:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: ContractNegotiationState.FINALIZED
      };

      jest
        .spyOn(transferService, "checkForFinalizedNegotiation")
        .mockResolvedValue(negotiation);

      const result = await transferService.obtainNegotiation(
        datasetId,
        address,
        audience
      );

      expect(result).toEqual(negotiation);
    });

    it("should handle missing offer", async () => {
      const datasetId = "dataset-id";
      const address = "address";
      const audience = "audience";
      const dataset: DatasetDto = {} as DatasetDto;

      jest.spyOn(transferService, "getDataset").mockResolvedValue(dataset);

      const negotiation: NegotiationDetailDto = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:uuid:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: ContractNegotiationState.FINALIZED
      };

      jest
        .spyOn(transferService, "checkForFinalizedNegotiation")
        .mockResolvedValue(negotiation);

      const result = await transferService.obtainNegotiation(
        datasetId,
        address,
        audience
      );
      expect(result).toBeTruthy();
    });
  });
  describe("getNegotiation", () => {
    it("should return negotiation details when the request is successful", async () => {
      const processId = "test-process-id";
      const negotiationDetail: NegotiationDetailDto = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:uuid:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: ContractNegotiationState.FINALIZED
      };

      jest.spyOn(transferService["axiosManagement"], "get").mockResolvedValue({
        data: negotiationDetail
      });

      const result = await transferService.getNegotiation(processId);
      expect(result).toEqual(negotiationDetail);
    });

    it("should throw DataPlaneClientError when the request fails", async () => {
      const processId = "test-process-id";
      const error = new Error("Request failed");

      jest
        .spyOn(transferService["axiosManagement"], "get")
        .mockRejectedValue(error);

      await expect(transferService.getNegotiation(processId)).rejects.toThrow(
        `Fetching negotiation ${processId} failed`
      );
    });
  });

  describe("requestTransfer", () => {
    let negotiation: NegotiationDetailDto;
    let address: string;
    let audience: string;
    let datasetId: string;

    beforeEach(() => {
      negotiation = {
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
          "@id": "urn:uuid:agreement-id",
          "@type": "odrl:Agreement",
          "odrl:assigner": "did:web:localhost",
          "odrl:assignee": "did:web:localhost",
          "dspace:timestamp": new Date().toISOString(),
          "odrl:target": "urn:uuid:dataset"
        }
      };
      address = "http://localhost:3000";
      audience = "test-audience";
      datasetId = "urn:uuid:test-dataset";
    });

    it("should request a transfer successfully", async () => {
      jest.spyOn(transferService["axiosManagement"], "post").mockResolvedValue({
        data: {}
      });

      await transferService.requestTransfer(
        negotiation,
        address,
        audience,
        datasetId
      );

      expect(transferService["axiosManagement"].post).toHaveBeenCalledWith(
        "transfers/request",
        null,
        {
          params: {
            address: address,
            agreementId: negotiation.agreement!["@id"],
            audience: audience
          }
        }
      );
    });

    it("should throw an error if agreement ID is not found", async () => {
      delete negotiation.agreement;

      await expect(
        transferService.requestTransfer(
          negotiation,
          address,
          audience,
          datasetId
        )
      ).rejects.toThrow(
        `No agreement ID found for negotiation ${negotiation.localId}`
      );
    });

    it("should throw a DataPlaneClientError if the request fails", async () => {
      const error = new Error("Request failed");
      jest
        .spyOn(transferService["axiosManagement"], "post")
        .mockRejectedValue(error);

      await expect(
        transferService.requestTransfer(
          negotiation,
          address,
          audience,
          datasetId
        )
      ).rejects.toThrow("Transfer request failed");
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

      jest
        .spyOn(transferService.transferRepository, "findOne")
        .mockResolvedValueOnce(transfer);

      const result = await transferService.determineTransferId(
        datasetId,
        audience,
        controlPlaneAddress
      );

      expect(result).toBe(transfer.id);
    });

    it("should request a new negotiation and transfer if no active transfer is found", async () => {
      jest
        .spyOn(transferService.transferRepository, "findOne")
        .mockResolvedValueOnce(null);

      const negotiation = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:uuid:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: ContractNegotiationState.FINALIZED
      } as NegotiationDetailDto;

      jest
        .spyOn(transferService, "obtainNegotiation")
        .mockResolvedValue(negotiation);

      jest
        .spyOn(transferService, "requestTransfer")
        .mockResolvedValue(undefined);

      const transfer = {
        id: "urn:uuid:transfer-id",
        datasetId: datasetId,
        state: TransferState.STARTED,
        createdDate: new Date()
      } as TransferDao;

      jest
        .spyOn(transferService, "retryFindTransfer")
        .mockResolvedValue(transfer);

      const result = await transferService.determineTransferId(
        datasetId,
        audience,
        controlPlaneAddress
      );

      expect(result).toBe(transfer.id);
      expect(transferService.obtainNegotiation).toHaveBeenCalledWith(
        datasetId,
        expect.any(String),
        audience
      );
      expect(transferService.requestTransfer).toHaveBeenCalledWith(
        negotiation,
        expect.any(String),
        audience,
        datasetId
      );
    });

    it("should throw an error if no transfer is found after retries", async () => {
      jest
        .spyOn(transferService.transferRepository, "findOne")
        .mockResolvedValueOnce(null);

      const negotiation = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:uuid:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: ContractNegotiationState.FINALIZED
      } as NegotiationDetailDto;

      jest
        .spyOn(transferService, "obtainNegotiation")
        .mockResolvedValue(negotiation);

      jest
        .spyOn(transferService, "requestTransfer")
        .mockResolvedValue(undefined);

      jest.spyOn(transferService, "retryFindTransfer").mockResolvedValue(null);

      await expect(
        transferService.determineTransferId(
          datasetId,
          audience,
          controlPlaneAddress
        )
      ).rejects.toThrow(`No transfer found for dataset ${datasetId}`);
    });

    it("should handle errors during negotiation request", async () => {
      jest
        .spyOn(transferService.transferRepository, "findOne")
        .mockResolvedValueOnce(null);

      jest
        .spyOn(transferService, "obtainNegotiation")
        .mockRejectedValue(new Error("Negotiation error"));

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
      jest.restoreAllMocks();
    });

    it("should return transfer if found within max retries", async () => {
      const datasetId = "urn:uuid:test-datasetjee";
      const transfer = {
        id: "urn:uuid:transfer-id",
        datasetId: datasetId,
        state: TransferState.STARTED,
        createdDate: new Date()
      } as TransferDao;

      jest
        .spyOn(transferService.transferRepository, "findOne")
        .mockResolvedValueOnce(transfer);

      const result = await transferService.retryFindTransfer(datasetId, 3, 1);

      expect(result).toBe(transfer);
      expect(transferService.transferRepository.findOne).toHaveBeenCalledTimes(
        1
      );
    });

    it("should return null if transfer is not found after max retries", async () => {
      const datasetId = "urn:uuid:test-dataset";

      jest
        .spyOn(transferService.transferRepository, "findOne")
        .mockResolvedValueOnce(null);

      const result = await transferService.retryFindTransfer(datasetId, 3, 1);

      expect(result).toBeNull();
      expect(transferService.transferRepository.findOne).toHaveBeenCalledTimes(
        3
      );
    });
  });
  describe("checkForFinalizedNegotiation", () => {
    it("should return negotiation when state is FINALIZED", async () => {
      const negotiationId = "test-id";
      const negotiation = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: "dspace:FINALIZED"
      } as NegotiationDetailDto;

      jest
        .spyOn(transferService, "getNegotiation")
        .mockResolvedValue(negotiation);

      const result =
        await transferService.checkForFinalizedNegotiation(negotiationId);

      expect(result).toEqual(negotiation);
    });

    it("should return undefined when state is not FINALIZED", async () => {
      const negotiationId = "test-id";
      const negotiation = {
        localId: "test",
        remoteId: "test",
        events: [],
        remoteParty: "did:web:test",
        remoteAddress: "remoteAddress",
        dataSet: "urn:1234",
        modifiedDate: new Date(),
        role: "provider" as NegotiationRole,
        state: "dspace:REQUESTED"
      } as NegotiationDetailDto;

      jest
        .spyOn(transferService, "getNegotiation")
        .mockResolvedValue(negotiation);

      const result =
        await transferService.checkForFinalizedNegotiation(negotiationId);

      expect(result).toBeUndefined();
    });

    it("should throw an error if getNegotiation fails", async () => {
      const negotiationId = "test-id";
      const error = new Error("Request failed");

      jest.spyOn(transferService, "getNegotiation").mockRejectedValue(error);

      await expect(
        transferService.checkForFinalizedNegotiation(negotiationId)
      ).rejects.toThrow("Request failed");
    });
  });
});
