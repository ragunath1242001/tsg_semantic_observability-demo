import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneService } from "./dataplane.service";
import { DataPlaneTestController } from "./dataplane.controller";
import { HttpException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { RootConfig } from "../config";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import { DataPlaneCreation } from "../model/data-planes/dataPlanes.dto";
import {
  DataAddress,
  EndpointProperty,
  TransferCompletionMessage,
  TransferRequestMessage,
  TransferStartMessage,
} from "../model/dsp/transfer/messages";
import { Request } from "express";
import { getMockRes } from "@jest-mock/express";

describe("Dataplane Service", () => {
  let dataPlaneService: DataPlaneService;
  let server: SetupServer;
  let managementToken: string;

  beforeAll(async () => {
    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        authorization: "Basic YWRtaW46YWRtaW4=",
        initializationDelay: 1,
      },
      dataset: {
        title: "HTTPBin",
        distributions: [
          {
            backend: "https://httpbin.org/anything",
            openApiSpec: "https://httpbin.org/spec.json",
            version: "0.9.2",
            authorization: "Bearer AAAAAAA",
          },
        ],
      },
    });

    server = setupServer(
      http.post<PathParams, DataPlaneCreation>(
        `${config.controlPlane.dataPlaneEndpoint}/init`,
        async ({ request, params, cookies }) => {
          const requestBody = await request.json();
          managementToken = requestBody.managementToken;
          return HttpResponse.json({
            ...requestBody,
            identifier: "urn:uuid:4ab97081-665e-447e-88a1-791a185994b9",
          });
        },
      ),
      http.post(
        `${config.controlPlane.dataPlaneEndpoint}/:id/catalog`,
        ({ request, params, cookies }) => {
          return HttpResponse.json(request.json());
        },
      ),
      http.post("https://httpbin.org/anything/0.9.2/anything/test", () => {
        return HttpResponse.json({
          args: {
            filter: "filterQueryString",
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
            "X-Amzn-Trace-Id": "Root=1-6571e4ca-792829da6e6bcb6115862d0b",
          },
          json: {
            test: "test2",
          },
          method: "POST",
          origin: "0.0.0.0",
          url: "https://httpbin.org/anything/0.9.2/anything/test",
        });
      }),
    );

    server.listen({ onUnhandledRequest: "bypass" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DataPlaneTestController],
      providers: [
        DataPlaneService,
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();

    dataPlaneService = moduleRef.get(DataPlaneService);

    await new Promise((r) => setTimeout(r, 20));
  });

  describe("Provider process", () => {
    let transferProcessId = "urn:uuid:4904fd10-05c0-40fe-99f8-ce4a7d336c4f";
    let authorization = "";

    const request = {
      method: "POST",
      path: "/0.9.2/anything/test",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      query: {
        filter: "filterQueryString",
      } as qs.ParsedQs,
      body: {
        test: "test2",
      },
    } as Request;
    it("Transfer request", async () => {
      const result = await dataPlaneService.transferRequest(
        new TransferRequestMessage({
          agreementId: "urn:uuid:cadb401e-4275-4d77-99a2-5aa2af93e3b7",
          format: "dspace:HTTP",
          callbackAddress: "http://127.0.0.1/test",
        }),
        "provider",
        transferProcessId,
      );
      transferProcessId = result.identifier;
      authorization =
        result.dataAddress?.properties?.find(
          ({ name }) => name === "Authorization",
        )?.value || "UNKNOWN";
      expect(result.dataAddress).toBeDefined();
    });

    it("Transfer execution on requested", async () => {
      const response = getMockRes();
      await expect(
        dataPlaneService.handleProxyRequest(
          transferProcessId,
          authorization,
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("accessing is not allowed");
    });

    it("Transfer start", async () => {
      await dataPlaneService.transferStart(
        new TransferStartMessage({
          processId: transferProcessId,
        }),
        transferProcessId,
      );
    });

    it("Transfer execution", async () => {
      const response = getMockRes();
      await dataPlaneService.handleProxyRequest(
        transferProcessId,
        authorization,
        "0.9.2",
        "anything/test",
        request,
        response.res,
      );

      await new Promise((r) => setTimeout(r, 50));

      const resultBody = JSON.parse(
        Buffer.from(
          (response.res.write as jest.Mock).mock.calls[0][0],
        ).toString(),
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
        dataPlaneService.handleProxyRequest(
          transferProcessId,
          "UNKNOWN",
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("Incorrect authorization header");
    });

    it("Transfer execution on unknown transfer", async () => {
      const response = getMockRes();
      await expect(
        dataPlaneService.handleProxyRequest(
          "urn:uuid:00000000-0000-0000-0000-000000000000",
          "UNKNOWN",
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("not found");
    });

    it("Transfer completion", async () => {
      await dataPlaneService.transferComplete(
        new TransferCompletionMessage({
          processId: transferProcessId,
        }),
        transferProcessId,
      );
    });

    it("Transfer execution on completed", async () => {
      const response = getMockRes();
      await expect(
        dataPlaneService.handleProxyRequest(
          transferProcessId,
          authorization,
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("accessing is not allowed");
    });
  });

  describe("Consumer process", () => {
    let transferProcessId = "urn:uuid:dab7264b-7ff4-4182-9e89-6238a57b5006";
    const request = {
      method: "POST",
      path: "/0.9.2/anything/test",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      query: {
        filter: "filterQueryString",
      } as qs.ParsedQs,
      body: {
        test: "test2",
      },
    } as Request;

    it("Transfer Request", async () => {
      const result = await dataPlaneService.transferRequest(
        new TransferRequestMessage({
          agreementId: "urn:uuid:e785d4a8-2030-4a2b-b223-9881e35c0df7",
          format: "dspace:HTTP",
          callbackAddress: "http://127.0.0.1/test",
        }),
        "consumer",
        transferProcessId,
      );
      transferProcessId = result.identifier;
    });

    it("Transfer execution on requested", async () => {
      const response = getMockRes();
      await expect(
        dataPlaneService.executeProxyRequest(
          transferProcessId,
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("accessing is not allowed");
    });

    it("Transfer start", async () => {
      await dataPlaneService.transferStart(
        new TransferStartMessage({
          processId: transferProcessId,
          dataAddress: new DataAddress({
            endpoint: `https://httpbin.org/anything`,
            endpointType: "HTTP",
            endpointProperties: [
              new EndpointProperty({
                name: "Authorization",
                value: "Bearer ABCDEF",
              }),
            ],
          }),
        }),
        transferProcessId,
      );
    });

    it("Transfer execution", async () => {
      const response = getMockRes();
      await dataPlaneService.executeProxyRequest(
        transferProcessId,
        "0.9.2",
        "anything/test",
        request,
        response.res,
      );
      await new Promise((r) => setTimeout(r, 10));
      const resultBody = JSON.parse(
        Buffer.from(
          (response.res.write as jest.Mock).mock.calls[0][0],
        ).toString(),
      );
      expect(resultBody["json"]["test"]).toBe("test2");
      expect(resultBody["headers"]["Content-Type"]).toBe("application/json");
      expect(resultBody["headers"]["Accept"]).toBe("application/json");
      expect(resultBody["args"]["filter"]).toBe("filterQueryString");
      expect((response.res.status as jest.Mock).mock.calls[0][0]).toBe(200);
    });

    it("Transfer execution on unknown transfer", async () => {
      const response = getMockRes();
      await expect(
        dataPlaneService.executeProxyRequest(
          "urn:uuid:00000000-0000-0000-0000-000000000000",
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("not found");
    });

    it("Transfer completion", async () => {
      await dataPlaneService.transferComplete(
        new TransferCompletionMessage({
          processId: transferProcessId,
        }),
        transferProcessId,
      );
    });

    it("Transfer execution on completed", async () => {
      const response = getMockRes();
      await expect(
        dataPlaneService.executeProxyRequest(
          transferProcessId,
          "0.9.2",
          "anything/test",
          request,
          response.res,
        ),
      ).rejects.toThrow("accessing is not allowed");
    });
  });
});
