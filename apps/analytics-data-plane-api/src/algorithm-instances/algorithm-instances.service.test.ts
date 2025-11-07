import { jest } from "@jest/globals";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CreateAlgorithmInstanceDto,
  UIElementType
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
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
  ITransferHandler,
  NegotiationClientService,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import {
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../config.js";
import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

describe("AlgorithmInstancesService", () => {
  let server: SetupServer;
  let algorithmInstancesService: AlgorithmInstancesService;

  const sampleAlgorithmInstanceDto: CreateAlgorithmInstanceDto = {
    id: "test-instance-id",
    algorithmDefinition: {
      title: "Test Algorithm Instance",
      description: "This is a test algorithm instance",
      keywords: ["test", "algorithm"],
      image:
        "registry.gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/adp-test-image:latest",
      algorithmEvents: [
        {
          name: "test-event",
          description: "This is a test event",
          type: "json"
        }
      ],
      roleDefinitions: [
        {
          name: "participant",
          cardinality: {
            min: 1
          },
          states: [{ name: "test" }],
          communicatesToRoles: ["participant"]
        }
      ],
      internalEvents: [
        {
          name: "test-internal-event",
          description: "This is a test event",
          type: "counter"
        }
      ],
      uiTemplate: [
        {
          metric: "test-internal-event",
          description: "This is a test UI element",
          type: UIElementType.FIELD
        }
      ]
    },
    participants: [
      {
        didId: "did:web:localhost",
        role: "participant",
        dataset: "urn:uuid:30b95804-685d-4f53-9903-8581d6e5b21d"
      },
      {
        didId: "did:web:remoteparty.com",
        role: "participant",
        dataset: "urn:uuid:b00ccdb5-11f1-4b2a-b132-8ee78dc418e8"
      },
      {
        didId: "did:web:remoteparty2.com",
        role: "participant",
        dataset: "urn:uuid:652c71d1-81c5-4b42-9ed0-6f6d75f30b31"
      }
    ]
  };

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const config = plainToClass(RootConfig, {
      server: {},
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        initializationDelay: 1
      },
      logging: {
        debug: true
      }
    });

    server = setupServer(
      ...createDataPlaneHttpMocks(config.controlPlane.dataPlaneEndpoint),
      ...createDataPlaneManagementHttpMocks(
        config.controlPlane.managementEndpoint
      ),
      ...createDidConnectorHttpMocks(),
      http.post(
        `http://localhost:3000/data-address/events/:instanceId/algorithm-event`,
        () => {
          return HttpResponse.text();
        }
      )
    );
    server.listen({ onUnhandledRequest: "error" });
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        TypeOrmTestHelper.instance.module([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao
        ])
      ],
      providers: [
        AlgorithmInstancesService,
        AuthClientService,
        CatalogClientService,
        NegotiationClientService,
        TransferClientService,
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: ControlPlaneConfig,
          useValue: config.controlPlane
        },
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        },
        {
          provide: ITransferHandler,
          useClass: AnalyticsTransferHandler
        }
      ]
    }).compile();

    algorithmInstancesService = module.get(AlgorithmInstancesService);
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  it("should be defined", () => {
    expect(algorithmInstancesService).toBeDefined();
  });

  it("should create an algorithm instance", async () => {
    // Mock the distribution method to avoid actual HTTP calls
    jest
      .spyOn(algorithmInstancesService, "distributeAlgorithmInstance")
      .mockResolvedValue();

    const result = await algorithmInstancesService.createAlgorithmInstance(
      sampleAlgorithmInstanceDto
    );
    expect(result).toBeDefined();
    expect(result.id).toBe(sampleAlgorithmInstanceDto.id);
    expect(result.participants).toEqual(
      sampleAlgorithmInstanceDto.participants
    );
    expect(result.status).toBe("pending");
    expect(result.createdDate).toBeDefined();

    const findAllResult =
      await algorithmInstancesService.getAlgorithmInstances();
    expect(findAllResult).toBeDefined();
    expect(findAllResult.length).toBeGreaterThan(0);

    expect(
      await algorithmInstancesService.getAlgorithmInstanceDto(result.id)
    ).toBeDefined();
    await expect(
      algorithmInstancesService.getAlgorithmInstanceDto("unknown-id")
    ).rejects.toThrow("not found");

    expect(
      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-instance-id-2"
      })
    ).toBeDefined();
    await algorithmInstancesService.removeAlgorithmInstance(
      "test-instance-id-2"
    );
    await expect(
      algorithmInstancesService.removeAlgorithmInstance("unknown-id")
    ).rejects.toThrow("not found");
  });
  it("should link transfers to algorithm instance", async () => {
    const createDto: CreateAlgorithmInstanceDto = {
      ...sampleAlgorithmInstanceDto,
      id: "test-instance-id-3"
    };
    const algorithmInstance =
      await algorithmInstancesService.createAlgorithmInstance(createDto);

    const transferDao = await algorithmInstancesService[
      "algorithmInstanceRepository"
    ]["manager"]
      ["getRepository"](TransferDao)
      .save({
        id: "test-transfer-id",
        role: "provider",
        processId: "test-process-id",
        remoteParty: "did:web:remoteparty.com",
        datasetId: "urn:uuid:test-dataset-id",
        state: TransferState.REQUESTED,
        request: {} as TransferRequestMessageDto,
        response: {} as DataPlaneRequestResponseDto
      });

    await algorithmInstancesService.linkTransfer({
      algorithmInstanceId: algorithmInstance.id,
      transfer: transferDao
    });
    expect(
      (
        await algorithmInstancesService.getAlgorithmInstance(
          "test-instance-id-3"
        )
      ).transfers
    ).toHaveLength(1);
    const reloadedTransferDao = await algorithmInstancesService[
      "transferHandler"
    ].getTransferById(transferDao.id);
    expect(reloadedTransferDao).toBeDefined();
    expect(
      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-instance-id-2"
      })
    ).toBeDefined();
    await expect(
      algorithmInstancesService.linkTransfer({
        algorithmInstanceId: "test-instance-id-2",
        transfer: reloadedTransferDao!
      })
    ).rejects.toThrow("already linked to");

    const retrievedAlgorithmInstance =
      await algorithmInstancesService.getAlgorithmInstanceFromTransferId(
        transferDao.id
      );
    expect(retrievedAlgorithmInstance.id).toBe(algorithmInstance.id);
    await expect(
      algorithmInstancesService.getAlgorithmInstanceFromTransferId("unknown-id")
    ).rejects.toThrow("not found");
  });
  it("should create access tokens", async () => {
    const algorithmInstance =
      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-instance-id-4"
      });

    const accessToken = await algorithmInstancesService.createAccessToken(
      algorithmInstance.id
    );
    expect(accessToken).toBeDefined();
    expect(
      algorithmInstancesService["accessTokens"].has(accessToken)
    ).toBeTruthy();

    await algorithmInstancesService.validateAccessToken(
      algorithmInstance.id,
      accessToken
    );
    await expect(
      algorithmInstancesService.validateAccessToken(
        algorithmInstance.id,
        "invalid-token"
      )
    ).rejects.toThrow("Invalid token for algorithm instance");
  });
});
