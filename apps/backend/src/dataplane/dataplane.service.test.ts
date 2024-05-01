import { Test, TestingModule } from "@nestjs/testing";
import { DataPlaneService } from "./dataplane.service";
import { DataPlaneController } from "./dataplane.controller";
import { plainToClass } from "class-transformer";
import { AuthConfig, RootConfig } from "../config";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import { Request } from "express";
import { getMockRes } from "@jest-mock/express";
import { DataPlaneCreation } from "@tsg-dsp/common";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { TransferDao } from "./transfer.dao";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataPlaneStateDao } from "./dataplane.dao";
import { AuthClientService } from "../auth/auth.client.service";
import { RawBodyRequest } from "@nestjs/common";

describe("Dataplane Service", () => {
  let dataPlaneService: DataPlaneService;
  let server: SetupServer;
  let managementToken: string;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
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
      imports: [
        TypeOrmTestHelper.instance.module([TransferDao, DataPlaneStateDao]),
        TypeOrmModule.forFeature([TransferDao, DataPlaneStateDao]),
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        AuthClientService,
        {
          provide: AuthConfig,
          useValue: { enabled: false },
        },
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();

    dataPlaneService = moduleRef.get(DataPlaneService);

    await new Promise((r) => setTimeout(r, 20));
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
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
      rawBody: Buffer.from(JSON.stringify({ test: "test2" }), "utf-8"),
    } as RawBodyRequest<Request>;
    it("Transfer request", async () => {
      const result = await dataPlaneService.transferRequest(
        {
          "@type": "dspace:TransferRequestMessage",
          "dspace:agreementId": "urn:uuid:cadb401e-4275-4d77-99a2-5aa2af93e3b7",
          "dct:format": "dspace:HTTP",
          "dspace:callbackAddress": "http://127.0.0.1/test",
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
        },
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
        {
          "@type": "dspace:TransferStartMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
        },
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
        {
          "@type": "dspace:TransferCompletionMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
        },
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
        {
          "@type": "dspace:TransferRequestMessage",
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
          "dspace:agreementId": "urn:uuid:e785d4a8-2030-4a2b-b223-9881e35c0df7",
          "dct:format": "dspace:HTTP",
          "dspace:callbackAddress": "http://127.0.0.1/test",
        },
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
                "dspace:value": "Bearer ABCDEF",
              },
            ],
          },
        },
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
        {
          "@type": "dspace:TransferCompletionMessage",
          "dspace:providerPid": transferProcessId,
          "dspace:consumerPid": "urn:uuid:00000000-0000-0000-0000-000000000000",
        },
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
