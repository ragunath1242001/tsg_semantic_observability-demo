import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthClientService,
  AuthConfig,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  DataPlaneCreation,
  DatasetDto,
  defaultContext
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { RootConfig } from "../config.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { DataPlaneController } from "./dataplane.controller.js";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { DataPlaneService } from "./dataplane.service.js";
import { ManagementClientMock } from "./management-client.mock.js";
import { ManagementClient } from "./management-client.service.js";
import { TransferDao } from "./transfer.dao.js";

describe("Dataplane Service", () => {
  let dataPlaneService: DataPlaneService;
  let server: SetupServer;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const initialDataset: DatasetDto = {
      "@context": defaultContext(),
      "@type": "Dataset",
      "@id": "urn:uuid:test",
      title: "HTTPBin",
      hasPolicy: [
        {
          "@type": "Offer",
          "@id": "urn:uuid:3fdbf466-b2de-45ef-bc9b-215267091ed0",
          assigner: "did:web:localhost",
          permission: [
            {
              "@type": "Permission",
              action: "use"
            }
          ]
        }
      ],
      distribution: [
        {
          "@type": "Distribution",
          "@id": "urn:uuid:f2f7c1a0-51b9-4383-b084-d4a7e524f61f",
          conformsTo: ["https://httpbin.org/spec.json"],
          format: "tsg:analytics",
          title: "HTTPBin"
        }
      ]
    };
    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        authorization: "Basic YWRtaW46YWRtaW4=",
        initializationDelay: 1
      },
      dataset: [initialDataset],
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
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json({
          service: [
            {
              type: "connector",
              serviceEndpoint: "http://remotecontrolplane/"
            }
          ]
        });
      })
    );

    server.listen({ onUnhandledRequest: "bypass" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao,
          DataPlaneStateDao
        ])
      ],
      controllers: [DataPlaneController],
      providers: [
        DataPlaneService,
        AuthClientService,
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ManagementClient,
          useValue: ManagementClientMock
        }
      ]
    }).compile();

    dataPlaneService = moduleRef.get(DataPlaneService);
    await expect(dataPlaneService.getStateDto()).rejects.toThrow(
      "No state available yet"
    );

    await dataPlaneService.initialized;
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Config management", () => {
    it("Update config", async () => {
      await dataPlaneService.updateDatasets([]);
      const config = await dataPlaneService.getDatasets();
      expect(config).toHaveLength(0);
    });
  });
});
