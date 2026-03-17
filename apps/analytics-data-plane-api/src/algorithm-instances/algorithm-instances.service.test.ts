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
});
