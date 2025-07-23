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
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState
} from "@tsg-dsp/common-dsp";

import { RootConfig } from "../config.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";
import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

describe("AlgorithmInstancesService", () => {
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
        didId: "did:web:remoteparty",
        role: "participant",
        dataset: "urn:uuid:b00ccdb5-11f1-4b2a-b132-8ee78dc418e8"
      },
      {
        didId: "did:web:remoteparty2",
        role: "participant",
        dataset: "urn:uuid:652c71d1-81c5-4b42-9ed0-6f6d75f30b31"
      }
    ]
  };

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
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
        {
          provide: RootConfig,
          useValue: {
            controlPlane: {
              dataPlaneEndpoint: "http://127.0.0.1/data-plane",
              managementEndpoint: "http://localhost:3000/management",
              controlEndpoint: "http://localhost:3000",
              authorization: "Basic YWRtaW46YWRtaW4=",
              initializationDelay: 1
            }
          }
        },
        {
          provide: AuthConfig,
          useValue: { enabled: false }
        }
      ]
    }).compile();

    algorithmInstancesService = module.get(AlgorithmInstancesService);
  });

  it("should be defined", () => {
    expect(algorithmInstancesService).toBeDefined();
  });

  it("should create an algorithm instance", async () => {
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
        remoteParty: "did:web:remoteparty",
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
    expect(
      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-instance-id-2"
      })
    ).toBeDefined();
    await expect(
      algorithmInstancesService.linkTransfer({
        algorithmInstanceId: algorithmInstance.id,
        transfer: transferDao
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

    await algorithmInstancesService.verifyAlgorithmInstanceToken(
      algorithmInstance.id,
      accessToken
    );
    await expect(
      algorithmInstancesService.verifyAlgorithmInstanceToken(
        algorithmInstance.id,
        "invalid-token"
      )
    ).rejects.toThrow("Invalid token for algorithm instance");
  });
});
