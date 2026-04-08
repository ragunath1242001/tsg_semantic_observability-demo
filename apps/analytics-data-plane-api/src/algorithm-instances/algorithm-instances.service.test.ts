import { EventEmitterModule } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AlgorithmInstanceDto,
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
  DataPlaneError,
  ITransferHandler,
  NegotiationClientService,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import {
  createDataPlaneHttpMocks,
  createDataPlaneManagementHttpMocks,
  createDidConnectorHttpMocks
} from "@tsg-dsp/common-data-plane-api/testing";
import {
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { vi } from "vitest";

import { SplitModeService } from "../bridge/split-mode/split-mode.service.js";
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
  let eventEmitter: EventEmitter2;

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
        },
        SplitModeService
      ]
    }).compile();

    algorithmInstancesService = module.get(AlgorithmInstancesService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  it("should be defined", () => {
    expect(algorithmInstancesService).toBeDefined();
  });

  it("should create an algorithm instance", async () => {
    // Mock the distribution method to avoid actual HTTP calls
    vi.spyOn(
      algorithmInstancesService,
      "distributeAlgorithmInstance"
    ).mockResolvedValue();

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
    // Mark as completed so it can be deleted (pending/running instances are blocked)
    await algorithmInstancesService.updateStatus(
      "test-instance-id-2",
      "completed"
    );
    await algorithmInstancesService.removeAlgorithmInstance(
      "test-instance-id-2"
    );
    await expect(
      algorithmInstancesService.removeAlgorithmInstance("unknown-id")
    ).rejects.toThrow("not found");
  });

  it("emits algorithm-instances.updated on updateStatus in server mode", async () => {
    const emitSpy = vi.spyOn(eventEmitter, "emit");

    vi.spyOn(
      algorithmInstancesService,
      "distributeAlgorithmInstance"
    ).mockResolvedValue();

    const created = await algorithmInstancesService.createAlgorithmInstance(
      sampleAlgorithmInstanceDto
    );

    await algorithmInstancesService.updateStatus(created.id, "completed");

    expect(emitSpy).toHaveBeenCalledWith(
      "algorithm-instances.updated",
      expect.objectContaining({
        algorithmInstance: expect.objectContaining({ id: created.id })
      })
    );
  });

  it("emits algorithm-instances.created on receiveAlgorithmInstanceFromPeer", async () => {
    const emitSpy = vi.spyOn(eventEmitter, "emit");

    const secret = "peer-transfer-secret";
    await algorithmInstancesService["algorithmInstanceRepository"]["manager"]
      ["getRepository"](TransferDao)
      .save({
        id: "peer-transfer-id",
        role: "provider",
        processId: "peer-process-id",
        remoteParty: "did:web:initiator.example",
        datasetId: "urn:uuid:peer-dataset-id",
        secret,
        state: TransferState.REQUESTED,
        request: {} as TransferRequestMessageDto,
        response: {} as DataPlaneRequestResponseDto
      });

    const incoming: AlgorithmInstanceDto = {
      id: "peer-instance-id",
      algorithmDefinition: sampleAlgorithmInstanceDto.algorithmDefinition,
      participants: sampleAlgorithmInstanceDto.participants,
      createdDate: new Date(),
      status: "pending",
      transfers: [],
      algorithmEvents: [],
      internalEvents: []
    };

    await algorithmInstancesService.receiveAlgorithmInstanceFromPeer({
      createAlgorithmInstance: incoming,
      authorizationHeader: `Bearer ${secret}`
    });

    expect(emitSpy).toHaveBeenCalledWith(
      "algorithm-instances.created",
      expect.objectContaining({
        algorithmInstance: expect.objectContaining({ id: incoming.id })
      })
    );
  });
  it("should link transfers to algorithm instance", async () => {
    vi.spyOn(
      algorithmInstancesService,
      "distributeAlgorithmInstance"
    ).mockResolvedValue();
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
    ]!.getTransferById(transferDao.id);
    expect(reloadedTransferDao).toBeDefined();
    expect(
      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-instance-id-link-duplicate"
      })
    ).toBeDefined();
    await expect(
      algorithmInstancesService.linkTransfer({
        algorithmInstanceId: "test-instance-id-link-duplicate",
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
    vi.spyOn(
      algorithmInstancesService,
      "distributeAlgorithmInstance"
    ).mockResolvedValue();
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
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

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
          projectAgreementId: "9999"
        })
      ).rejects.toThrow("Project Agreement with id 9999 not found");
    });

    it("should throw error when project agreement is not finalized", async () => {
      vi.spyOn(
        algorithmInstancesService["projectAgreementsService"]!,
        "findById"
      ).mockResolvedValue({
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
          projectAgreementId: "1"
        })
      ).rejects.toThrow("not finalized");
    });

    it("should throw error when algorithm instance participants are not in project agreement", async () => {
      vi.spyOn(
        algorithmInstancesService["projectAgreementsService"]!,
        "findById"
      ).mockResolvedValue({
        id: "2",
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
          projectAgreementId: "2"
        })
      ).rejects.toThrow("not part of the project agreement");
    });

    it("should successfully create algorithm instance with valid project agreement", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();
      const datasetRepo =
        algorithmInstancesService["algorithmInstanceRepository"]["manager"][
          "getRepository"
        ](DatasetDao);
      const savedDataset = await datasetRepo.save({
        id: "valid-dataset-id",
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
        id: "4",
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
      vi.spyOn(
        algorithmInstancesService["projectAgreementsService"]!,
        "findById"
      ).mockResolvedValue(savedProjectAgreement);
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
        projectAgreementId: "4"
      });

      expect(result).toBeDefined();
      expect(result.projectAgreement).toBeDefined();
      expect(result.projectAgreement?.id).toBe("4");
      expect(result.projectAgreement?.projectId).toBe("test-valid-pa");
      expect(result.projectAgreement?.hash).toBe("ghi789");
      expect(result.projectAgreement?.status).toBe("FINALIZED");
      // Add small delay to ensure distributing instance is not executed during test teardown
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  describe("Deletion - blocking active instances", () => {
    it("should block deletion of pending instances", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-pending"
      });

      await expect(
        algorithmInstancesService.removeAlgorithmInstance("test-delete-pending")
      ).rejects.toThrow("Cannot delete algorithm instance with status");
    });

    it("should block deletion of running instances", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-running"
      });
      await algorithmInstancesService.updateStatus(
        "test-delete-running",
        "running"
      );

      await expect(
        algorithmInstancesService.removeAlgorithmInstance("test-delete-running")
      ).rejects.toThrow("Cannot delete algorithm instance with status");
    });

    it("should allow deletion of completed instances", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-completed"
      });
      await algorithmInstancesService.updateStatus(
        "test-delete-completed",
        "completed"
      );

      await expect(
        algorithmInstancesService.removeAlgorithmInstance(
          "test-delete-completed"
        )
      ).resolves.toBeUndefined();
    });

    it("should allow deletion of failed instances", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-failed"
      });
      await algorithmInstancesService.updateStatus(
        "test-delete-failed",
        "failed"
      );

      await expect(
        algorithmInstancesService.removeAlgorithmInstance("test-delete-failed")
      ).resolves.toBeUndefined();
    });

    it("should allow deletion of terminated instances", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-terminated"
      });
      await algorithmInstancesService.updateStatus(
        "test-delete-terminated",
        "terminated"
      );

      await expect(
        algorithmInstancesService.removeAlgorithmInstance(
          "test-delete-terminated"
        )
      ).resolves.toBeUndefined();
    });

    it("should allow deletion of cancelled instances", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-cancelled"
      });
      await algorithmInstancesService.updateStatus(
        "test-delete-cancelled",
        "cancelled"
      );

      await expect(
        algorithmInstancesService.removeAlgorithmInstance(
          "test-delete-cancelled"
        )
      ).resolves.toBeUndefined();
    });
  });

  describe("Soft-delete vs hard-delete", () => {
    it("should soft-delete by default (instance not returned by find but exists with withDeleted)", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-soft-delete"
      });
      await algorithmInstancesService.updateStatus(
        "test-soft-delete",
        "completed"
      );
      await algorithmInstancesService.removeAlgorithmInstance(
        "test-soft-delete"
      );

      // Normal find should not return it
      await expect(
        algorithmInstancesService.getAlgorithmInstanceDto("test-soft-delete")
      ).rejects.toThrow("not found");

      // But it should still exist with withDeleted
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const softDeleted = await repo.findOne({
        where: { id: "test-soft-delete" },
        withDeleted: true
      });
      expect(softDeleted).toBeDefined();
      expect(softDeleted!.deletedDate).toBeDefined();
    });

    it("should hard-delete when hardDelete flag is true", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-hard-delete"
      });
      await algorithmInstancesService.updateStatus(
        "test-hard-delete",
        "completed"
      );
      await algorithmInstancesService.removeAlgorithmInstance(
        "test-hard-delete",
        true
      );

      // Should not exist even with withDeleted
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const hardDeleted = await repo.findOne({
        where: { id: "test-hard-delete" },
        withDeleted: true
      });
      expect(hardDeleted).toBeNull();
    });
  });

  describe("Event emissions on delete", () => {
    it("should emit JOB_DELETE and ALGORITHM_INSTANCES_DELETED events on removal", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-delete-events"
      });
      await algorithmInstancesService.updateStatus(
        "test-delete-events",
        "completed"
      );

      emitSpy.mockClear();

      await algorithmInstancesService.removeAlgorithmInstance(
        "test-delete-events"
      );

      expect(emitSpy).toHaveBeenCalledWith(
        "job.delete",
        expect.objectContaining({
          algorithmInstanceId: "test-delete-events"
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(
        "algorithm-instances.deleted",
        expect.objectContaining({
          algorithmInstanceId: "test-delete-events"
        })
      );
    });
  });

  describe("Pruning", () => {
    it("should return pruned count for existing soft-deleted instances", async () => {
      // Clean up any leftover soft-deleted instances from other tests first
      await algorithmInstancesService.pruneAlgorithmInstances(0);

      // Now there should be none left
      const result = await algorithmInstancesService.pruneAlgorithmInstances(0);
      expect(result).toEqual({ pruned: 0 });
    });

    it("should hard-delete soft-deleted instances when pruning with olderThanDays=0", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-prune-target"
      });
      await algorithmInstancesService.updateStatus(
        "test-prune-target",
        "completed"
      );
      await algorithmInstancesService.removeAlgorithmInstance(
        "test-prune-target"
      );

      // Verify it's soft-deleted
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const softDeleted = await repo.findOne({
        where: { id: "test-prune-target" },
        withDeleted: true
      });
      expect(softDeleted).toBeDefined();

      // Prune with olderThanDays=0 should remove all soft-deleted
      const result = await algorithmInstancesService.pruneAlgorithmInstances(0);
      expect(result.pruned).toBeGreaterThanOrEqual(1);

      // Verify it's gone
      const pruned = await repo.findOne({
        where: { id: "test-prune-target" },
        withDeleted: true
      });
      expect(pruned).toBeNull();
    });

    it("should not prune recently soft-deleted instances when olderThanDays > 0", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-prune-recent"
      });
      await algorithmInstancesService.updateStatus(
        "test-prune-recent",
        "completed"
      );
      await algorithmInstancesService.removeAlgorithmInstance(
        "test-prune-recent"
      );

      // Prune with olderThanDays=30 should not remove recently deleted
      const result =
        await algorithmInstancesService.pruneAlgorithmInstances(30);
      expect(result.pruned).toBe(0);

      // Verify it still exists
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const stillExists = await repo.findOne({
        where: { id: "test-prune-recent" },
        withDeleted: true
      });
      expect(stillExists).toBeDefined();

      // Clean up
      await repo.remove(stillExists!);
    });

    it("handlePruneCron calls pruneAlgorithmInstances with 14 days", async () => {
      const pruneSpy = vi
        .spyOn(algorithmInstancesService, "pruneAlgorithmInstances")
        .mockResolvedValue({ pruned: 0 });

      await algorithmInstancesService.handlePruneCron();

      expect(pruneSpy).toHaveBeenCalledWith(14);
    });
  });

  describe("Status update timestamps", () => {
    it("should set startedAt when transitioning to running", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-running"
      });

      const result = await algorithmInstancesService.updateStatus(
        "test-timestamp-running",
        "running"
      );

      expect(result.startedAt).toBeDefined();
      expect(result.status).toBe("running");
    });

    it("should not overwrite startedAt on subsequent running updates", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-no-overwrite"
      });

      const first = await algorithmInstancesService.updateStatus(
        "test-timestamp-no-overwrite",
        "running"
      );
      const second = await algorithmInstancesService.updateStatus(
        "test-timestamp-no-overwrite",
        "running"
      );

      expect(first.startedAt).toEqual(second.startedAt);
    });

    it("should set finishedAt when transitioning to completed", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-completed"
      });

      const result = await algorithmInstancesService.updateStatus(
        "test-timestamp-completed",
        "completed"
      );

      expect(result.finishedAt).toBeDefined();
    });

    it("should set finishedAt when transitioning to failed", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-failed"
      });

      const result = await algorithmInstancesService.updateStatus(
        "test-timestamp-failed",
        "failed"
      );

      expect(result.finishedAt).toBeDefined();
    });

    it("should set finishedAt when transitioning to terminated", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-terminated"
      });

      const result = await algorithmInstancesService.updateStatus(
        "test-timestamp-terminated",
        "terminated"
      );

      expect(result.finishedAt).toBeDefined();
    });

    it("should set finishedAt when transitioning to cancelled", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-cancelled"
      });

      const result = await algorithmInstancesService.updateStatus(
        "test-timestamp-cancelled",
        "cancelled"
      );

      expect(result.finishedAt).toBeDefined();
    });

    it("should use provided observedAt for timestamps", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      const observedAt = new Date("2025-01-01T00:00:00Z");

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-observed"
      });

      const result = await algorithmInstancesService.updateStatus(
        "test-timestamp-observed",
        "running",
        { observedAt }
      );

      expect(result.startedAt).toEqual(observedAt);
    });

    it("should not overwrite finishedAt on subsequent terminal status updates", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-timestamp-no-overwrite-finish"
      });

      const first = await algorithmInstancesService.updateStatus(
        "test-timestamp-no-overwrite-finish",
        "completed"
      );
      const second = await algorithmInstancesService.updateStatus(
        "test-timestamp-no-overwrite-finish",
        "failed"
      );

      expect(first.finishedAt).toEqual(second.finishedAt);
    });
  });

  describe("isValidJobAccessToken", () => {
    it("should return true for a valid token", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      const instance = await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-valid-token"
      });

      const token = await algorithmInstancesService.createAccessToken(
        instance.id
      );

      expect(
        algorithmInstancesService.isValidJobAccessToken(token, instance.id)
      ).toBe(true);
    });

    it("should return false for an invalid token", async () => {
      expect(
        algorithmInstancesService.isValidJobAccessToken(
          "nonexistent-token",
          "any-id"
        )
      ).toBe(false);
    });

    it("should return false for a valid token paired with wrong instance", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      const instance = await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-wrong-instance-token"
      });

      const token = await algorithmInstancesService.createAccessToken(
        instance.id
      );

      expect(
        algorithmInstancesService.isValidJobAccessToken(
          token,
          "different-instance"
        )
      ).toBe(false);
    });
  });

  describe("createAlgorithmInstance events", () => {
    it("should emit ALGORITHM_INSTANCES_CREATED event", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      emitSpy.mockClear();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-create-event"
      });

      expect(emitSpy).toHaveBeenCalledWith(
        "algorithm-instances.created",
        expect.objectContaining({
          algorithmInstance: expect.objectContaining({
            id: "test-create-event"
          })
        })
      );
    });

    it("should set initial status to pending", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      const result = await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-initial-status"
      });

      expect(result.status).toBe("pending");
      expect(result.startedAt).toBeFalsy();
      expect(result.finishedAt).toBeFalsy();
    });
  });

  describe("updateStatus notifyStatusChange", () => {
    it("should emit algorithm-instances.updated in standalone mode", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      await algorithmInstancesService.createAlgorithmInstance({
        ...sampleAlgorithmInstanceDto,
        id: "test-notify-standalone"
      });

      emitSpy.mockClear();

      await algorithmInstancesService.updateStatus(
        "test-notify-standalone",
        "running"
      );

      expect(emitSpy).toHaveBeenCalledWith(
        "algorithm-instances.updated",
        expect.objectContaining({
          algorithmInstance: expect.objectContaining({
            id: "test-notify-standalone",
            status: "running"
          })
        })
      );
    });
  });

  describe("requireProjectAgreement config flag", () => {
    it("should throw when requireProjectAgreement is true and no projectAgreementId provided", async () => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();

      // Temporarily set the runtime config
      const originalRuntime = algorithmInstancesService["config"].runtime;
      Object.defineProperty(algorithmInstancesService["config"], "runtime", {
        value: { ...originalRuntime, requireProjectAgreement: true },
        configurable: true
      });

      await expect(
        algorithmInstancesService.createAlgorithmInstance({
          ...sampleAlgorithmInstanceDto,
          id: "test-require-pa"
        })
      ).rejects.toThrow("project agreement is required");

      // Restore
      Object.defineProperty(algorithmInstancesService["config"], "runtime", {
        value: originalRuntime,
        configurable: true
      });
    });
  });

  describe("Orchestration fault tolerance", () => {
    const orchestrationInstanceBase = {
      ...sampleAlgorithmInstanceDto,
      participants: [
        {
          didId: "did:web:localhost",
          role: "participant",
          dataset: "urn:uuid:local-dataset"
        },
        {
          didId: "did:web:remote-1.com",
          role: "participant",
          dataset: "urn:uuid:remote-1-dataset"
        },
        {
          didId: "did:web:remote-2.com",
          role: "participant",
          dataset: "urn:uuid:remote-2-dataset"
        }
      ]
    };

    beforeEach(() => {
      vi.spyOn(
        algorithmInstancesService,
        "distributeAlgorithmInstance"
      ).mockResolvedValue();
    });

    it("should set orchestrationStatus to 'pending' on creation", async () => {
      const result = await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-pending-test"
      });

      expect(result.orchestrationStatus).toBe("pending");
    });

    it("should set orchestrationStatus to 'running' when markInstanceAsRunning is called", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-running-test"
      });

      const instance =
        await algorithmInstancesService["getAlgorithmInstance"](
          "orch-running-test"
        );
      await algorithmInstancesService["markInstanceAsRunning"](instance);

      const reloaded =
        await algorithmInstancesService.getAlgorithmInstanceDto(
          "orch-running-test"
        );
      expect(reloaded.orchestrationStatus).toBe("running");
    });

    it("should set orchestrationStatus to 'completed' when all participants succeed (initiator)", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-all-succeed"
      });

      // Simulate initiator recording own result
      await algorithmInstancesService.recordOwnJobResult(
        "orch-all-succeed",
        "completed"
      );

      // Set participant statuses directly on the DB entity
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({ id: "orch-all-succeed" });
      instance.participantStatuses = {
        ...instance.participantStatuses,
        "did:web:remote-1.com": "completed",
        "did:web:remote-2.com": "completed"
      };
      await repo.save(instance);

      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      const reloaded =
        await algorithmInstancesService.getAlgorithmInstanceDto(
          "orch-all-succeed"
        );
      expect(reloaded.orchestrationStatus).toBe("completed");
    });

    it("should set orchestrationStatus to 'error' when any participant fails (initiator)", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-one-fails"
      });

      // First participant succeeds
      await algorithmInstancesService.recordOwnJobResult(
        "orch-one-fails",
        "completed"
      );

      // Second participant fails — should immediately trigger error
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({ id: "orch-one-fails" });
      instance.participantStatuses = {
        ...instance.participantStatuses,
        "did:web:remote-1.com": "failed"
      };
      await repo.save(instance);

      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      const reloaded =
        await algorithmInstancesService.getAlgorithmInstanceDto(
          "orch-one-fails"
        );
      expect(reloaded.orchestrationStatus).toBe("error");
    });

    it("should set error immediately on first failure without waiting for all participants", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-immediate-error"
      });

      // Only one participant reports — and it failed
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({
        id: "orch-immediate-error"
      });
      instance.participantStatuses = {
        "did:web:remote-1.com": "failed"
      };
      await repo.save(instance);

      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      const reloaded = await algorithmInstancesService.getAlgorithmInstanceDto(
        "orch-immediate-error"
      );
      expect(reloaded.orchestrationStatus).toBe("error");
    });

    it("should not resolve orchestration status when not all participants have reported and none failed", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-partial-report"
      });

      // Only 1 of 3 participants has reported
      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({
        id: "orch-partial-report"
      });
      instance.participantStatuses = {
        "did:web:localhost": "completed"
      };
      await repo.save(instance);

      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      const reloaded = await algorithmInstancesService.getAlgorithmInstanceDto(
        "orch-partial-report"
      );
      // Should still be pending (from creation), not completed
      expect(reloaded.orchestrationStatus).toBe("pending");
    });

    it("should persist participantStatuses in the database after completion", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-persist-completed"
      });

      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({
        id: "orch-persist-completed"
      });
      instance.participantStatuses = {
        "did:web:localhost": "completed",
        "did:web:remote-1.com": "completed",
        "did:web:remote-2.com": "completed"
      };
      await repo.save(instance);

      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      const reloaded = await repo.findOneByOrFail({
        id: "orch-persist-completed"
      });
      expect(reloaded.participantStatuses).toEqual({
        "did:web:localhost": "completed",
        "did:web:remote-1.com": "completed",
        "did:web:remote-2.com": "completed"
      });
      expect(reloaded.orchestrationStatus).toBe("completed");
    });

    it("should persist participantStatuses in the database after error", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-persist-error"
      });

      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({
        id: "orch-persist-error"
      });
      instance.participantStatuses = {
        "did:web:remote-1.com": "failed"
      };
      await repo.save(instance);

      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      const reloaded = await repo.findOneByOrFail({
        id: "orch-persist-error"
      });
      expect(reloaded.participantStatuses).toEqual({
        "did:web:localhost": "terminated",
        "did:web:remote-1.com": "failed",
        "did:web:remote-2.com": "terminated"
      });
      expect(reloaded.orchestrationStatus).toBe("error");
    });

    it("should emit orchestration-status.updated event when status is resolved", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-emit-test"
      });

      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const instance = await repo.findOneByOrFail({ id: "orch-emit-test" });
      instance.participantStatuses = {
        "did:web:localhost": "completed",
        "did:web:remote-1.com": "completed",
        "did:web:remote-2.com": "completed"
      };
      await repo.save(instance);

      emitSpy.mockClear();
      await algorithmInstancesService["evaluateOrchestrationStatus"](instance);

      expect(emitSpy).toHaveBeenCalledWith(
        "orchestration-status.updated",
        expect.objectContaining({
          algorithmInstance: expect.objectContaining({
            id: "orch-emit-test",
            orchestrationStatus: "completed"
          })
        })
      );
    });

    it("should allow manually setting orchestration status to error", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-manual-error"
      });

      const result =
        await algorithmInstancesService.setOrchestrationStatusManually(
          "orch-manual-error",
          "error"
        );

      expect(result.orchestrationStatus).toBe("error");

      const reloaded =
        await algorithmInstancesService.getAlgorithmInstanceDto(
          "orch-manual-error"
        );
      expect(reloaded.orchestrationStatus).toBe("error");
    });

    it("should emit job.stop when orchestration status becomes error", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-stop-on-error"
      });

      emitSpy.mockClear();

      await algorithmInstancesService.setOrchestrationStatusManually(
        "orch-stop-on-error",
        "error"
      );

      expect(emitSpy).toHaveBeenCalledWith(
        "job.stop",
        expect.objectContaining({
          algorithmInstanceId: "orch-stop-on-error"
        })
      );
    });

    it("should not emit job.stop when orchestration status becomes completed", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-no-stop-on-completed"
      });

      emitSpy.mockClear();

      await algorithmInstancesService.setOrchestrationStatusManually(
        "orch-no-stop-on-completed",
        "completed"
      );

      expect(emitSpy).not.toHaveBeenCalledWith("job.stop", expect.anything());
    });

    it("should allow manually setting orchestration status to completed", async () => {
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-manual-completed"
      });

      const result =
        await algorithmInstancesService.setOrchestrationStatusManually(
          "orch-manual-completed",
          "completed"
        );

      expect(result.orchestrationStatus).toBe("completed");
    });

    it("should preserve isInitiator when receiving an instance from a peer", async () => {
      const secret = "orch-peer-secret";
      await algorithmInstancesService["algorithmInstanceRepository"]["manager"]
        ["getRepository"](TransferDao)
        .save({
          id: "orch-peer-transfer",
          role: "provider",
          processId: "orch-peer-process",
          remoteParty: "did:web:initiator.example",
          datasetId: "urn:uuid:orch-peer-dataset",
          secret,
          state: TransferState.REQUESTED,
          request: {} as TransferRequestMessageDto,
          response: {} as DataPlaneRequestResponseDto
        });

      const incoming: AlgorithmInstanceDto = {
        id: "orch-peer-instance",
        algorithmDefinition: sampleAlgorithmInstanceDto.algorithmDefinition,
        participants: sampleAlgorithmInstanceDto.participants,
        createdDate: new Date(),
        status: "pending",
        orchestrationStatus: "pending",
        isInitiator: false,
        transfers: [],
        algorithmEvents: [],
        internalEvents: []
      };

      await algorithmInstancesService.receiveAlgorithmInstanceFromPeer({
        createAlgorithmInstance: incoming,
        authorizationHeader: `Bearer ${secret}`
      });

      const reloaded =
        await algorithmInstancesService.getAlgorithmInstanceDto(
          "orch-peer-instance"
        );
      expect(reloaded.isInitiator).toBe(false);
      expect(reloaded.orchestrationStatus).toBe("pending");
    });

    it("should receive orchestration status from peer (worker side)", async () => {
      // Re-use the instance created above (orch-peer-instance) which has
      // isInitiator: false and a valid transfer secret
      await algorithmInstancesService.receiveOrchestrationStatusFromPeer(
        "orch-peer-instance",
        "error",
        "Bearer orch-peer-secret"
      );

      const reloaded =
        await algorithmInstancesService.getAlgorithmInstanceDto(
          "orch-peer-instance"
        );
      expect(reloaded.orchestrationStatus).toBe("error");
    });

    it("should reject orchestration status from peer with invalid token", async () => {
      await expect(
        algorithmInstancesService.receiveOrchestrationStatusFromPeer(
          "orch-peer-instance",
          "completed",
          "Bearer invalid-token"
        )
      ).rejects.toThrow("not found or not accessible");
    });

    it("should emit job.stop when receiving error orchestration status from peer", async () => {
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      // Create a fresh peer instance for this test
      const secret = "orch-peer-stop-secret";
      await algorithmInstancesService["algorithmInstanceRepository"]["manager"]
        ["getRepository"](TransferDao)
        .save({
          id: "orch-peer-stop-transfer",
          role: "provider",
          processId: "orch-peer-stop-process",
          remoteParty: "did:web:initiator.example",
          datasetId: "urn:uuid:orch-peer-stop-dataset",
          secret,
          state: TransferState.REQUESTED,
          request: {} as TransferRequestMessageDto,
          response: {} as DataPlaneRequestResponseDto
        });

      const incoming: AlgorithmInstanceDto = {
        id: "orch-peer-stop-instance",
        algorithmDefinition: sampleAlgorithmInstanceDto.algorithmDefinition,
        participants: sampleAlgorithmInstanceDto.participants,
        createdDate: new Date(),
        status: "running",
        orchestrationStatus: "pending",
        isInitiator: false,
        transfers: [],
        algorithmEvents: [],
        internalEvents: []
      };

      await algorithmInstancesService.receiveAlgorithmInstanceFromPeer({
        createAlgorithmInstance: incoming,
        authorizationHeader: `Bearer ${secret}`
      });

      emitSpy.mockClear();

      await algorithmInstancesService.receiveOrchestrationStatusFromPeer(
        "orch-peer-stop-instance",
        "error",
        `Bearer ${secret}`
      );

      expect(emitSpy).toHaveBeenCalledWith(
        "job.stop",
        expect.objectContaining({
          algorithmInstanceId: "orch-peer-stop-instance"
        })
      );
    });

    it("should record participant status when transfer completes (initiator side)", async () => {
      // Create an initiator instance with a consumer-role transfer
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-transfer-listener"
      });

      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const transferRepo = repo.manager.getRepository(TransferDao);
      const transfer = await transferRepo.save({
        id: "orch-listener-transfer-1",
        role: "consumer" as const,
        processId: "orch-listener-process-1",
        remoteParty: "did:web:remote-worker-1.com",
        datasetId: "urn:uuid:orch-listener-dataset-1",
        state: TransferState.STARTED as TransferState,
        request: {} as TransferRequestMessageDto,
        response: {} as DataPlaneRequestResponseDto,
        dataAddress: {
          endpoint: "http://remote-worker-1.com:3000",
          endpointType: "HttpData",
          endpointProperties: [
            { name: "Authorization", value: "Bearer worker-1-secret" }
          ]
        }
      });
      await algorithmInstancesService.linkTransfer({
        algorithmInstanceId: "orch-transfer-listener",
        transfer
      });

      // Register listeners (as the initiator would during distribution)
      algorithmInstancesService["registerTransferListeners"](
        "orch-transfer-listener",
        [transfer]
      );

      // Simulate transfer completion by firing the listener through the transfer handler
      const transferHandler = algorithmInstancesService["transferHandler"]!;
      // Simulate the DSP completion arriving by directly calling notifyListeners
      transfer.state = TransferState.COMPLETED;
      transferHandler["notifyListeners"](transfer, TransferState.COMPLETED);

      // Wait for the async handleTransferStateChange to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const reloaded = await repo.findOneByOrFail({
        id: "orch-transfer-listener"
      });
      expect(reloaded.participantStatuses).toEqual(
        expect.objectContaining({
          "did:web:remote-worker-1.com": "completed"
        })
      );
    });

    it("should record participant as failed when transfer is terminated (initiator side)", async () => {
      // Create an initiator instance with a consumer-role transfer
      await algorithmInstancesService.createAlgorithmInstance({
        ...orchestrationInstanceBase,
        id: "orch-transfer-terminated"
      });

      const repo = algorithmInstancesService["algorithmInstanceRepository"];
      const transferRepo = repo.manager.getRepository(TransferDao);
      const transfer = await transferRepo.save({
        id: "orch-terminated-transfer-1",
        role: "consumer" as const,
        processId: "orch-terminated-process-1",
        remoteParty: "did:web:remote-worker-fail.com",
        datasetId: "urn:uuid:orch-terminated-dataset-1",
        state: TransferState.STARTED as TransferState,
        request: {} as TransferRequestMessageDto,
        response: {} as DataPlaneRequestResponseDto,
        dataAddress: {
          endpoint: "http://remote-worker-fail.com:3000",
          endpointType: "HttpData",
          endpointProperties: [
            { name: "Authorization", value: "Bearer worker-fail-secret" }
          ]
        }
      });
      await algorithmInstancesService.linkTransfer({
        algorithmInstanceId: "orch-transfer-terminated",
        transfer
      });

      // Register listeners
      algorithmInstancesService["registerTransferListeners"](
        "orch-transfer-terminated",
        [transfer]
      );

      // Mock the broadcast HTTP call that will happen when orchestration status
      // is set to error (evaluateOrchestrationStatus fires broadcastOrchestrationStatus)
      server.use(
        http.post(
          "http://remote-worker-fail.com:3000/algorithm-instances/:id/orchestration-status",
          () => HttpResponse.json({ status: "ok" })
        )
      );

      // Simulate transfer termination
      const transferHandler = algorithmInstancesService["transferHandler"]!;
      transfer.state = TransferState.TERMINATED;
      transferHandler["notifyListeners"](transfer, TransferState.TERMINATED);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const reloaded = await repo.findOneByOrFail({
        id: "orch-transfer-terminated"
      });
      expect(reloaded.participantStatuses).toEqual(
        expect.objectContaining({
          "did:web:remote-worker-fail.com": "failed"
        })
      );
    });

    it("should propagate job result to initiator when worker reaches terminal status", async () => {
      // Create instance as a worker (isInitiator: false)
      const workerSecret = "orch-worker-propagate-secret";
      await algorithmInstancesService["algorithmInstanceRepository"]["manager"]
        ["getRepository"](TransferDao)
        .save({
          id: "orch-worker-propagate-transfer",
          role: "provider",
          processId: "orch-worker-propagate-process",
          remoteParty: "did:web:initiator.example",
          datasetId: "urn:uuid:orch-worker-propagate-dataset",
          secret: workerSecret,
          state: TransferState.REQUESTED,
          request: {} as TransferRequestMessageDto,
          response: {} as DataPlaneRequestResponseDto
        });

      const workerInstance: AlgorithmInstanceDto = {
        id: "orch-worker-propagate",
        algorithmDefinition: sampleAlgorithmInstanceDto.algorithmDefinition,
        participants: [
          {
            didId: "did:web:localhost",
            role: "participant",
            dataset: "ds1"
          }
        ],
        createdDate: new Date(),
        status: "pending",
        orchestrationStatus: "pending",
        isInitiator: false,
        transfers: [],
        algorithmEvents: [],
        internalEvents: []
      };

      await algorithmInstancesService.receiveAlgorithmInstanceFromPeer({
        createAlgorithmInstance: workerInstance,
        authorizationHeader: `Bearer ${workerSecret}`
      });

      // Spy on the transfer handler to verify completion is requested
      const transferHandler = algorithmInstancesService["transferHandler"]!;
      const completionSpy = vi
        .spyOn(transferHandler, "requestTransferCompletion")
        .mockResolvedValue();
      const terminationSpy = vi
        .spyOn(transferHandler, "requestTransferTermination")
        .mockResolvedValue();

      // Update status to completed - this should trigger propagateJobResult
      const updated = await algorithmInstancesService.updateStatus(
        "orch-worker-propagate",
        "completed"
      );

      // propagateJobResult is called via setImmediate, so wait for it
      await new Promise((resolve) => setImmediate(resolve));

      expect(updated.status).toBe("completed");
      expect(completionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "orch-worker-propagate-transfer" })
      );
      expect(terminationSpy).not.toHaveBeenCalled();

      completionSpy.mockRestore();
      terminationSpy.mockRestore();
    });

    it("should signal transfer termination when worker job fails", async () => {
      const workerSecret = "orch-worker-fail-secret";
      await algorithmInstancesService["algorithmInstanceRepository"]["manager"]
        ["getRepository"](TransferDao)
        .save({
          id: "orch-worker-fail-transfer",
          role: "provider",
          processId: "orch-worker-fail-process",
          remoteParty: "did:web:initiator.example",
          datasetId: "urn:uuid:orch-worker-fail-dataset",
          secret: workerSecret,
          state: TransferState.REQUESTED,
          request: {} as TransferRequestMessageDto,
          response: {} as DataPlaneRequestResponseDto
        });

      const workerInstance: AlgorithmInstanceDto = {
        id: "orch-worker-fail",
        algorithmDefinition: sampleAlgorithmInstanceDto.algorithmDefinition,
        participants: [
          {
            didId: "did:web:localhost",
            role: "participant",
            dataset: "ds1"
          }
        ],
        createdDate: new Date(),
        status: "pending",
        orchestrationStatus: "pending",
        isInitiator: false,
        transfers: [],
        algorithmEvents: [],
        internalEvents: []
      };

      await algorithmInstancesService.receiveAlgorithmInstanceFromPeer({
        createAlgorithmInstance: workerInstance,
        authorizationHeader: `Bearer ${workerSecret}`
      });

      const transferHandler = algorithmInstancesService["transferHandler"]!;
      const completionSpy = vi
        .spyOn(transferHandler, "requestTransferCompletion")
        .mockResolvedValue();
      const terminationSpy = vi
        .spyOn(transferHandler, "requestTransferTermination")
        .mockResolvedValue();

      await algorithmInstancesService.updateStatus(
        "orch-worker-fail",
        "failed"
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(terminationSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "orch-worker-fail-transfer" }),
        "JOB_FAILED",
        expect.stringContaining("orch-worker-fail")
      );
      expect(completionSpy).not.toHaveBeenCalled();

      completionSpy.mockRestore();
      terminationSpy.mockRestore();
    });
  });
});
