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
  DataPlaneError,
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
import { DatasetDao } from "../dataplane/dataset.dao.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import {
  ProjectAgreementCallbackDao,
  ProjectAgreementDao
} from "../project-agreements/project-agreement.dao.js";
import { ProjectAgreementsService } from "../project-agreements/project-agreements.service.js";
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
          AlgorithmEventDao,
          ProjectAgreementDao,
          ProjectAgreementCallbackDao,
          DatasetDao
        ]),
        TypeOrmModule.forFeature([
          TransferDao,
          AlgorithmInstanceDao,
          InternalEventDao,
          AlgorithmEventDao,
          ProjectAgreementDao,
          ProjectAgreementCallbackDao,
          DatasetDao
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
        },
        {
          provide: ProjectAgreementsService,
          useValue: {
            findById: (id: number) =>
              Promise.reject(
                new DataPlaneError(
                  `Project Agreement with id ${id} not found`,
                  404
                )
              )
          }
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
    jest
      .spyOn(algorithmInstancesService, "distributeAlgorithmInstance")
      .mockResolvedValue();
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
    jest
      .spyOn(algorithmInstancesService, "distributeAlgorithmInstance")
      .mockResolvedValue();
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

  describe("Project Agreement Validation", () => {
    it("should create algorithm instance without project agreement when not required", async () => {
      jest
        .spyOn(algorithmInstancesService, "distributeAlgorithmInstance")
        .mockResolvedValue();

      const result = await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-no-pa-instance"
      });
      expect(result).toBeDefined();
      expect(result.projectAgreement).toBeUndefined();
    });

    it("should throw error when project agreement not found", async () => {
      await expect(
        algorithmInstancesService.createAlgorithmInstance({
          ...sampleAlgorithmInstanceDto,
          id: "test-pa-not-found-instance",
          projectAgreementId: 9999
        })
      ).rejects.toThrow("Project Agreement with id 9999 not found");
    });

    it("should throw error when project agreement is not finalized", async () => {
      jest
        .spyOn(
          algorithmInstancesService["projectAgreementsService"],
          "findById"
        )
        .mockResolvedValue({
          id: 1,
          projectId: "test-unfinalized-pa",
          projectAgreement: {
            id: "test-unfinalized-pa",
            title: "Test Project",
            description: "Test Description",
            participants: [
              { didId: "did:web:localhost", title: "Local" },
              { didId: "did:web:remoteparty.com", title: "Remote" }
            ],
            validFrom: "2024-01-01",
            validUntil: "2025-01-01",
            purpose: "Testing",
            researchQuestion: "Test?",
            objectives: ["Test"],
            hypotheses: ["Test"],
            dataUseConditions: ["Test"],
            securityMeasures: ["Test"],
            complianceRequirements: ["Test"]
          },
          initiator: "did:web:localhost",
          status: "WAITING_FOR_SIGNATURES",
          signatures: {},
          callbacks: [],
          datasets: []
        } as unknown as ProjectAgreementDao);

      await expect(
        algorithmInstancesService.createAlgorithmInstance({
          ...sampleAlgorithmInstanceDto,
          id: "test-unfinalized-instance",
          participants: [
            { didId: "did:web:localhost", role: "participant", dataset: "ds1" }
          ],
          projectAgreementId: 1
        })
      ).rejects.toThrow("not finalized");
    });

    it("should throw error when algorithm instance participants are not in project agreement", async () => {
      jest
        .spyOn(
          algorithmInstancesService["projectAgreementsService"],
          "findById"
        )
        .mockResolvedValue({
          id: 2,
          projectId: "test-invalid-participants-pa",
          projectAgreement: {
            id: "test-invalid-participants-pa",
            title: "Test Project",
            description: "Test Description",
            participants: [{ didId: "did:web:localhost", title: "Local" }],
            validFrom: "2024-01-01",
            validUntil: "2025-01-01",
            purpose: "Testing",
            researchQuestion: "Test?",
            objectives: ["Test"],
            hypotheses: ["Test"],
            dataUseConditions: ["Test"],
            securityMeasures: ["Test"],
            complianceRequirements: ["Test"]
          },
          initiator: "did:web:localhost",
          status: "FINALIZED",
          signatures: {},
          hash: "abc123",
          callbacks: [],
          datasets: []
        } as unknown as ProjectAgreementDao);

      await expect(
        algorithmInstancesService.createAlgorithmInstance({
          ...sampleAlgorithmInstanceDto,
          id: "test-invalid-participants-instance",
          participants: [
            { didId: "did:web:localhost", role: "participant", dataset: "ds1" },
            {
              didId: "did:web:unknown-participant.com",
              role: "participant",
              dataset: "ds2"
            }
          ],
          projectAgreementId: 2
        })
      ).rejects.toThrow("not part of the project agreement");
    });

    it("should successfully create algorithm instance with valid project agreement", async () => {
      jest
        .spyOn(algorithmInstancesService, "distributeAlgorithmInstance")
        .mockResolvedValue();
      const datasetRepo =
        algorithmInstancesService["algorithmInstanceRepository"]["manager"][
          "getRepository"
        ](DatasetDao);
      const savedDataset = await datasetRepo.save({
        identifier: "valid-dataset-id",
        dataset: {
          "@id": "valid-dataset-id",
          "@type": "Dataset",
          title: "Valid Dataset"
        }
      });
      const projectAgreementRepo =
        algorithmInstancesService["algorithmInstanceRepository"]["manager"][
          "getRepository"
        ](ProjectAgreementDao);
      const savedProjectAgreement = await projectAgreementRepo.save({
        id: 4,
        projectId: "test-valid-pa",
        projectAgreement: {
          id: "test-valid-pa",
          title: "Test Project",
          description: "Test Description",
          participants: [
            { didId: "did:web:localhost", title: "Local" },
            { didId: "did:web:remoteparty.com", title: "Remote" }
          ],
          validFrom: "2024-01-01",
          validUntil: "2025-01-01",
          purpose: "Testing",
          researchQuestion: "Test?",
          objectives: ["Test"],
          hypotheses: ["Test"],
          dataUseConditions: ["Test"],
          securityMeasures: ["Test"],
          complianceRequirements: ["Test"]
        },
        initiator: "did:web:localhost",
        status: "FINALIZED",
        signatures: {},
        hash: "ghi789",
        callbacks: [],
        datasets: [savedDataset]
      });
      jest
        .spyOn(
          algorithmInstancesService["projectAgreementsService"],
          "findById"
        )
        .mockResolvedValue(savedProjectAgreement);
      const result = await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-valid-pa-instance",
        participants: [
          {
            didId: "did:web:localhost",
            role: "participant",
            dataset: "valid-dataset-id"
          }
        ],
        projectAgreementId: 4
      });

      expect(result).toBeDefined();
      expect(result.projectAgreement).toBeDefined();
      expect(result.projectAgreement?.id).toBe(4);
      expect(result.projectAgreement?.projectId).toBe("test-valid-pa");
      expect(result.projectAgreement?.hash).toBe("ghi789");
      expect(result.projectAgreement?.status).toBe("FINALIZED");
      // Add small delay to ensure distributing instance is not executed during test teardown
      await new Promise((r) => setTimeout(r, 10));
    });
  });
});
