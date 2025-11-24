import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ProjectAgreementDto,
  ProjectAgreementFinalizationMessage,
  SignatureRequestMessage,
  SignatureResponseMessage
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  AuthClientService,
  AuthConfig,
  ServerConfig,
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
  TransferClientService,
  WalletClientService
} from "@tsg-dsp/common-data-plane-api";
import { DatasetDto, defaultContext } from "@tsg-dsp/common-dsp";
import { plainToClass } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { Repository } from "typeorm";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { RootConfig } from "../config.js";
import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { DatasetDao } from "../dataplane/dataset.dao.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import {
  ProjectAgreementCallbackDao,
  ProjectAgreementDao
} from "./project-agreement.dao.js";
import { ProjectAgreementsService } from "./project-agreements.service.js";

describe("ProjectAgreementsService", () => {
  let server: SetupServer;
  let projectAgreementsService: ProjectAgreementsService;
  let catalogService: CatalogClientService;
  let walletService: WalletClientService;
  let negotiationService: NegotiationClientService;
  let transferService: TransferClientService;
  let transferHandler: AnalyticsTransferHandler;
  let dataplaneService: DataPlaneService;
  let datasetRepository: Repository<DatasetDao>;

  const sampleProjectAgreementDto: ProjectAgreementDto = {
    id: "test-project-id",
    title: "Test Project Agreement",
    description: "A test project agreement for testing purposes",
    participants: [
      {
        title: "Localhost Participant",
        didId: "did:web:localhost"
      },
      {
        title: "Remote Party",
        didId: "did:web:remoteparty.com"
      }
    ],
    validFrom: "2024-01-01T00:00:00Z",
    validUntil: "2025-01-01T00:00:00Z",
    purpose: "Testing",
    researchQuestion: "How well does the test work?",
    objectives: ["Test objective 1", "Test objective 2"],
    hypotheses: ["Test hypothesis 1"],
    dataUseConditions: ["Data use condition 1"],
    securityMeasures: ["Security measure 1"],
    complianceRequirements: ["Compliance requirement 1"]
  };

  const sampleDataset: DatasetDto = {
    "@context": defaultContext(),
    "@type": "Dataset",
    "@id": "urn:uuid:test-dataset",
    title: "Test Dataset",
    hasPolicy: [
      {
        "@type": "Offer",
        "@id": "urn:uuid:test-policy",
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
        "@id": "urn:uuid:test-distribution",
        format: "tsg:analytics",
        title: "Test Distribution"
      }
    ]
  };

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();

    const config = plainToClass(RootConfig, {
      server: {
        publicAddress: "http://localhost:3000"
      },
      controlPlane: {
        dataPlaneEndpoint: "http://127.0.0.1/data-plane",
        managementEndpoint: "http://localhost:3000/management",
        controlEndpoint: "http://localhost:3000",
        initializationDelay: 1
      },
      wallet: {
        endpoint: "http://localhost:3001/wallet"
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
      // Mock signature request endpoint
      http.post(
        "http://test-remote-endpoint/project-agreements/signature-request",
        () => {
          return HttpResponse.json({});
        }
      ),
      // Mock signature callback endpoint
      http.post(
        "http://localhost:3000/project-agreements/signature-callback",
        () => {
          return HttpResponse.json({});
        }
      ),
      // Mock finalization endpoint
      http.post(
        "http://test-remote-endpoint/project-agreements/finalization",
        () => {
          return HttpResponse.json({});
        }
      ),
      // Mock finalization endpoint at mock-endpoint
      http.post("http://mock-endpoint/project-agreements/finalization", () => {
        return HttpResponse.json({});
      })
    );

    server.listen({ onUnhandledRequest: "warn" });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          ProjectAgreementDao,
          ProjectAgreementCallbackDao,
          TransferDao,
          DatasetDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao
        ]),
        TypeOrmModule.forFeature([
          ProjectAgreementDao,
          ProjectAgreementCallbackDao,
          TransferDao,
          DatasetDao,
          AlgorithmInstanceDao,
          AlgorithmEventDao,
          InternalEventDao
        ])
      ],
      providers: [
        ProjectAgreementsService,
        AuthClientService,
        CatalogClientService,
        NegotiationClientService,
        TransferClientService,
        WalletClientService,
        {
          provide: DataPlaneService,
          useValue: {
            getDataset: jest
              .fn<() => Promise<DatasetDto>>()
              .mockResolvedValue(sampleDataset),
            updateDataset: jest
              .fn<() => Promise<void>>()
              .mockResolvedValue(undefined)
          }
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
          provide: ServerConfig,
          useValue: config.server
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

    projectAgreementsService = module.get(ProjectAgreementsService);
    catalogService = module.get(CatalogClientService);
    walletService = module.get(WalletClientService);
    negotiationService = module.get(NegotiationClientService);
    transferService = module.get(TransferClientService);
    transferHandler = module.get(ITransferHandler);
    dataplaneService = module.get(DataPlaneService);
    datasetRepository = module.get("DatasetDaoRepository");
  });

  afterEach(async () => {
    // Clear repositories after each test
    const projectAgreementRepo =
      projectAgreementsService["projectAgreementsRepository"];
    const callbackRepo = projectAgreementsService["callbackRepository"];
    await callbackRepo.clear();
    await projectAgreementRepo.clear();
    await datasetRepository.clear();
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  it("should be defined", () => {
    expect(projectAgreementsService).toBeDefined();
  });

  describe("findAll", () => {
    it("should return an empty array when no project agreements exist", async () => {
      const result = await projectAgreementsService.findAll();
      expect(result).toEqual([]);
    });

    it("should return all project agreements", async () => {
      // Create a test project agreement
      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-1",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      const result = await projectAgreementsService.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe("test-project-1");
    });
  });

  describe("findAllDto", () => {
    it("should return an empty array when no project agreements exist", async () => {
      const result = await projectAgreementsService.findAllDto();
      expect(result).toEqual([]);
    });

    it("should return all project agreements as DTOs with mapped datasets", async () => {
      // Create a test dataset first
      const dataset = await datasetRepository.save({
        identifier: "urn:uuid:test-dataset",
        dataset: sampleDataset
      });

      // Create a test project agreement with datasets
      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-2",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "FINALIZED",
        signatures: {},
        callbacks: [],
        datasets: [dataset]
      });

      const result = await projectAgreementsService.findAllDto();
      expect(result).toHaveLength(1);
      expect(result[0].initiator).toBe("did:web:localhost");
      expect(result[0].projectAgreement).toEqual(sampleProjectAgreementDto);
      expect(result[0].datasets).toHaveLength(1);
      expect(result[0].datasets[0].id).toBe("urn:uuid:test-dataset");
      expect(result[0].datasets[0].title).toBe("Test Dataset");
    });
  });

  describe("findById", () => {
    it("should find a project agreement by ID", async () => {
      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-3",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      const result = await projectAgreementsService.findById(agreement.id);
      expect(result).toBeDefined();
      expect(result.projectId).toBe("test-project-3");
    });

    it("should throw an error when project agreement is not found", async () => {
      await expect(projectAgreementsService.findById(99999)).rejects.toThrow(
        "Project Agreement with id 99999 not found"
      );
    });
  });

  describe("findByProjectId", () => {
    it("should find a project agreement by project ID", async () => {
      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-4",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      const result =
        await projectAgreementsService.findByProjectId("test-project-4");
      expect(result).toBeDefined();
      expect(result.projectId).toBe("test-project-4");
    });

    it("should throw an error when project agreement is not found", async () => {
      await expect(
        projectAgreementsService.findByProjectId("non-existent")
      ).rejects.toThrow(
        "Project Agreement with projectId non-existent not found"
      );
    });
  });

  describe("findByHash", () => {
    it("should find a project agreement by hash", async () => {
      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-5",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "FINALIZED",
        signatures: {},
        hash: "test-hash-123",
        callbacks: [],
        datasets: []
      });

      const result = await projectAgreementsService.findByHash("test-hash-123");
      expect(result).toBeDefined();
      expect(result.hash).toBe("test-hash-123");
    });

    it("should throw an error when project agreement is not found", async () => {
      await expect(
        projectAgreementsService.findByHash("non-existent-hash")
      ).rejects.toThrow(
        "Project Agreement with hash non-existent-hash not found"
      );
    });
  });

  describe("create", () => {
    it("should create a project agreement with callbacks for other participants", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      jest
        .spyOn(projectAgreementsService, "requestSignatures")
        .mockResolvedValue();

      const result = await projectAgreementsService.create(
        sampleProjectAgreementDto
      );

      expect(result).toBeDefined();
      expect(result.initiator).toBe("did:web:localhost");
      expect(result.projectAgreement).toEqual(sampleProjectAgreementDto);
      expect(result.status).toBe("WAITING_FOR_SIGNATURES");
      expect(result.datasets).toEqual([]);

      // Verify the agreement was saved to the database
      const savedAgreement = await projectAgreementsService.findByProjectId(
        sampleProjectAgreementDto.id
      );
      expect(savedAgreement.callbacks).toHaveLength(1); // One callback for the remote party
      expect(savedAgreement.callbacks[0].participantId).toBe(
        "did:web:remoteparty.com"
      );
    });

    it("should not create callbacks for the initiator", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      jest
        .spyOn(projectAgreementsService, "requestSignatures")
        .mockResolvedValue();

      const singleParticipantDto: ProjectAgreementDto = {
        ...sampleProjectAgreementDto,
        id: "single-participant-project",
        participants: [
          {
            title: "Localhost Only",
            didId: "did:web:localhost"
          }
        ]
      };

      await projectAgreementsService.create(singleParticipantDto);

      const savedAgreement = await projectAgreementsService.findByProjectId(
        singleParticipantDto.id
      );
      expect(savedAgreement.callbacks).toHaveLength(0);
    });
  });

  describe("linkDatasetToProjectAgreement", () => {
    it("should link a dataset to a finalized project agreement", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");

      // Create dataset first to avoid foreign key constraint
      await datasetRepository.save({
        identifier: "urn:uuid:test-dataset",
        dataset: sampleDataset
      });

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-6",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "FINALIZED",
        signatures: {},
        hash: "finalized-hash",
        callbacks: [],
        datasets: []
      });

      await projectAgreementsService.linkDatasetToProjectAgreement(
        agreement.id,
        "urn:uuid:test-dataset"
      );

      // Verify the dataset was linked
      const updated = await projectAgreementsService.findById(agreement.id);
      expect(updated.datasets).toHaveLength(1);
      expect(updated.datasets[0].identifier).toBe("urn:uuid:test-dataset");

      // Verify the dataset policy was updated
      expect(dataplaneService.updateDataset).toHaveBeenCalled();
    });

    it("should not link the same dataset twice to a project agreement", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      // Create dataset first to avoid foreign key constraint
      await datasetRepository.save({
        identifier: "urn:uuid:test-dataset",
        dataset: sampleDataset
      });

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-6",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "FINALIZED",
        signatures: {},
        hash: "finalized-hash",
        callbacks: [],
        datasets: []
      });

      await projectAgreementsService.linkDatasetToProjectAgreement(
        agreement.id,
        "urn:uuid:test-dataset"
      );

      await expect(
        projectAgreementsService.linkDatasetToProjectAgreement(
          agreement.id,
          "urn:uuid:test-dataset"
        )
      ).rejects.toThrow(
        `Dataset with id urn:uuid:test-dataset is already linked to project agreement ${agreement.id}`
      );
    });

    it("should throw an error if project agreement is not finalized", async () => {
      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-7",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      await expect(
        projectAgreementsService.linkDatasetToProjectAgreement(
          agreement.id,
          "urn:uuid:test-dataset"
        )
      ).rejects.toThrow(
        `Project Agreement with id ${agreement.id} is not finalized yet`
      );
    });
  });

  describe("unlinkDatasetFromProjectAgreement", () => {
    it("should unlink a dataset from a finalized project agreement", async () => {
      // Create dataset first
      const dataset = await datasetRepository.save({
        identifier: "urn:uuid:test-dataset",
        dataset: sampleDataset
      });

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-8",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "FINALIZED",
        signatures: {},
        hash: "finalized-hash-2",
        callbacks: [],
        datasets: [dataset]
      });

      await projectAgreementsService.unlinkDatasetFromProjectAgreement(
        agreement.id,
        "urn:uuid:test-dataset"
      );

      // Verify the dataset was unlinked
      const updated = await projectAgreementsService.findById(agreement.id);
      expect(updated.datasets).toHaveLength(0);

      // Verify the dataset policy was updated
      expect(dataplaneService.updateDataset).toHaveBeenCalled();
    });

    it("should throw an error if project agreement is not finalized", async () => {
      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-9",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      await expect(
        projectAgreementsService.unlinkDatasetFromProjectAgreement(
          agreement.id,
          "urn:uuid:test-dataset"
        )
      ).rejects.toThrow(
        `Project Agreement with id ${agreement.id} is not finalized yet`
      );
    });
  });

  describe("handleSignatureRequestMessage", () => {
    it("should handle a signature request message and create a project agreement", async () => {
      const mockTransfer: Partial<TransferDao> = {
        id: "test-transfer-1",
        remoteParty: "did:web:remoteparty.com"
      };

      jest
        .spyOn(transferHandler, "getTransferBySecret")
        .mockResolvedValue(mockTransfer as TransferDao);

      const signatureRequest: SignatureRequestMessage = {
        projectAgreement: sampleProjectAgreementDto,
        callback: {
          url: "http://remote-callback-url",
          authToken: "test-callback-token"
        }
      };

      await projectAgreementsService.handleSignatureRequestMessage(
        signatureRequest,
        "Bearer test-token"
      );

      // Verify the agreement was created
      const agreement = await projectAgreementsService.findByProjectId(
        sampleProjectAgreementDto.id
      );
      expect(agreement).toBeDefined();
      expect(agreement.status).toBe("SIGNATURE_REQUESTED");
      expect(agreement.initiator).toBe("did:web:remoteparty.com");
      expect(agreement.callbacks).toHaveLength(1);
      expect(agreement.callbacks[0].url).toBe("http://remote-callback-url");
    });
  });

  describe("signProjectAgreement", () => {
    it("should sign a project agreement and send callback", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      const mockSignature = {
        jwt: "test-signature-jwt",
        jws: "test-jws",
        jti: "test-jti"
      };
      jest
        .spyOn(walletService, "requestSignature")
        .mockResolvedValue(mockSignature);

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-10",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:remoteparty.com",
        status: "SIGNATURE_REQUESTED",
        signatures: {},
        callbacks: [
          {
            participantId: "did:web:remoteparty.com",
            url: "http://localhost:3000/project-agreements/signature-callback",
            authToken: "test-callback-token"
          } as ProjectAgreementCallbackDao
        ],
        datasets: []
      });

      await projectAgreementsService.signProjectAgreement(agreement.id);

      // Verify the agreement was signed
      const updated = await projectAgreementsService.findById(agreement.id);
      expect(updated.status).toBe("SIGNED");
      expect(updated.signatures["did:web:localhost"]).toBe(
        "test-signature-jwt"
      );
    });

    it("should throw an error if callbacks count is not exactly one", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      const mockSignature = {
        jwt: "test-signature-jwt",
        jws: "test-jws",
        jti: "test-jti"
      };
      jest
        .spyOn(walletService, "requestSignature")
        .mockResolvedValue(mockSignature);

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-11",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:remoteparty.com",
        status: "SIGNATURE_REQUESTED",
        signatures: {},
        callbacks: [], // No callbacks
        datasets: []
      });

      await expect(
        projectAgreementsService.signProjectAgreement(agreement.id)
      ).rejects.toThrow(
        `Expected exactly one callback for project agreement ${agreement.id}, found 0`
      );
    });
  });

  describe("handleSignatureCallback", () => {
    it("should handle a signature callback and update signatures", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      const mockValidation = {
        projectAgreement: sampleProjectAgreementDto
      };
      jest
        .spyOn(walletService, "validateSignature")
        .mockResolvedValue(mockValidation);
      const mockSignature = {
        jwt: "initiator-signature-jwt",
        jws: "test-jws",
        jti: "test-jti"
      };
      jest
        .spyOn(walletService, "requestSignature")
        .mockResolvedValue(mockSignature);
      jest.spyOn(walletService, "createOffer").mockResolvedValue({
        credential_issuer: "did:web:localhost",
        credential_configuration_ids: ["ProjectAgreementCredential"],
        grants: {
          "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
            "pre-authorized_code": "test-code"
          }
        }
      });
      jest.spyOn(walletService, "requestOfferViaDCP").mockResolvedValue();

      // Mock catalog service to avoid network calls
      jest.spyOn(catalogService, "getDatasetConformingTo").mockResolvedValue({
        "@id": "mock-dataset-id",
        "@type": "dcat:Dataset"
      } as never);

      // Mock negotiation and transfer services
      jest
        .spyOn(negotiationService, "requestDefaultNegotiation")
        .mockResolvedValue({
          localId: "mock-negotiation-id",
          agreement: {
            "@id": "mock-agreement-id",
            "@type": "odrl:Agreement"
          }
        } as never);

      jest.spyOn(transferService, "requestTransfer").mockResolvedValue({
        localId: "mock-transfer-id",
        "@id": "mock-transfer-urn",
        consumerPid: "mock-consumer-pid"
      } as never);

      // Mock transfer handler methods
      const mockTransferDao = {
        id: 1,
        processId: "mock-consumer-pid",
        dataAddress: { endpoint: "http://mock-endpoint" }
      } as unknown as TransferDao;

      jest
        .spyOn(transferHandler, "getTransferByProcessId")
        .mockResolvedValue(mockTransferDao);
      jest
        .spyOn(transferHandler, "addListener")
        .mockImplementation((_id, _state, callback) => {
          // Immediately resolve with the transfer
          setTimeout(() => callback(mockTransferDao), 0);
        });

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-12",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [
          {
            participantId: "did:web:remoteparty.com",
            url: "http://remote-callback-url",
            authToken: "test-callback-token"
          } as ProjectAgreementCallbackDao
        ],
        datasets: []
      });

      const signatureResponse: SignatureResponseMessage = {
        participantId: "did:web:remoteparty.com",
        projectId: "test-project-12",
        signature: "remote-party-signature-jwt"
      };

      await projectAgreementsService.handleSignatureCallback(
        signatureResponse,
        "Bearer test-callback-token"
      );

      // Verify the signature was added and hash was computed
      const updated = await projectAgreementsService.findById(agreement.id);
      expect(updated.signatures["did:web:remoteparty.com"]).toBe(
        "remote-party-signature-jwt"
      );
      expect(updated.signatures["did:web:localhost"]).toBe(
        "initiator-signature-jwt"
      );
      expect(updated.status).toBe("SIGNED");
      expect(updated.hash).toBeDefined();

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("should throw an error for unauthorized callback", async () => {
      // Wait for any pending async operations from previous test
      await new Promise((resolve) => setTimeout(resolve, 50));

      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-13",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [
          {
            participantId: "did:web:remoteparty.com",
            url: "http://remote-callback-url",
            authToken: "correct-token"
          } as ProjectAgreementCallbackDao
        ],
        datasets: []
      });

      const signatureResponse: SignatureResponseMessage = {
        participantId: "did:web:remoteparty.com",
        projectId: "test-project-13",
        signature: "remote-party-signature-jwt"
      };

      await expect(
        projectAgreementsService.handleSignatureCallback(
          signatureResponse,
          "Bearer wrong-token"
        )
      ).rejects.toThrow(
        "Unauthorized signature callback from participant did:web:remoteparty.com"
      );
    });

    it("should throw an error when signature validation fails", async () => {
      jest
        .spyOn(catalogService, "getParticipantId")
        .mockResolvedValue("did:web:localhost");
      const mockValidation = {
        projectAgreement: {
          ...sampleProjectAgreementDto,
          title: "Different Title" // Mismatch
        }
      };
      jest
        .spyOn(walletService, "validateSignature")
        .mockResolvedValue(mockValidation);

      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-14",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:localhost",
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks: [
          {
            participantId: "did:web:remoteparty.com",
            url: "http://remote-callback-url",
            authToken: "test-callback-token"
          } as ProjectAgreementCallbackDao
        ],
        datasets: []
      });

      const signatureResponse: SignatureResponseMessage = {
        participantId: "did:web:remoteparty.com",
        projectId: "test-project-14",
        signature: "remote-party-signature-jwt"
      };

      await expect(
        projectAgreementsService.handleSignatureCallback(
          signatureResponse,
          "Bearer test-callback-token"
        )
      ).rejects.toThrow(
        "Non matching project agreement content for participant did:web:remoteparty.com"
      );
    });
  });

  describe("handleFinalizationMessage", () => {
    it("should handle a finalization message and update the project agreement", async () => {
      const mockTransfer: Partial<TransferDao> = {
        id: "test-transfer-2",
        remoteParty: "did:web:remoteparty.com"
      };

      jest
        .spyOn(transferHandler, "getTransferBySecret")
        .mockResolvedValue(mockTransfer as TransferDao);
      jest
        .spyOn(walletService, "requestOfferViaDCP")
        .mockResolvedValue(undefined);

      const agreement = await projectAgreementsService[
        "projectAgreementsRepository"
      ].save({
        projectId: "test-project-15",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:remoteparty.com",
        status: "SIGNED",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      const finalizationMessage: ProjectAgreementFinalizationMessage = {
        projectId: "test-project-15",
        hash: "finalized-hash-value",
        signatures: {
          "did:web:localhost": "local-signature",
          "did:web:remoteparty.com": "remote-signature"
        },
        offer: {
          issuerId: "did:web:remoteparty.com",
          preAuthorizedCode: "test-pre-auth-code",
          credentialType: ["ProjectAgreementCredential"]
        }
      };

      await projectAgreementsService.handleFinalizationMessage(
        finalizationMessage,
        "Bearer test-token"
      );

      // Verify the agreement was finalized
      const updated = await projectAgreementsService.findById(agreement.id);
      expect(updated.status).toBe("FINALIZED");
      expect(updated.hash).toBe("finalized-hash-value");
      expect(updated.signatures).toEqual(finalizationMessage.signatures);

      // Verify wallet credential request was made
      expect(walletService.requestOfferViaDCP).toHaveBeenCalledWith(
        finalizationMessage.offer
      );
    });

    it("should throw an error if initiator does not match", async () => {
      const mockTransfer: Partial<TransferDao> = {
        id: "test-transfer-3",
        remoteParty: "did:web:unauthorized.com"
      };

      jest
        .spyOn(transferHandler, "getTransferBySecret")
        .mockResolvedValue(mockTransfer as TransferDao);

      await projectAgreementsService["projectAgreementsRepository"].save({
        projectId: "test-project-16",
        projectAgreement: sampleProjectAgreementDto,
        initiator: "did:web:remoteparty.com",
        status: "SIGNED",
        signatures: {},
        callbacks: [],
        datasets: []
      });

      const finalizationMessage: ProjectAgreementFinalizationMessage = {
        projectId: "test-project-16",
        hash: "finalized-hash-value",
        signatures: {},
        offer: {
          issuerId: "did:web:remoteparty.com",
          preAuthorizedCode: "test-pre-auth-code",
          credentialType: ["ProjectAgreementCredential"]
        }
      };

      await expect(
        projectAgreementsService.handleFinalizationMessage(
          finalizationMessage,
          "Bearer test-token"
        )
      ).rejects.toThrow(
        "Unauthorized finalization attempt by participant did:web:unauthorized.com"
      );
    });

    it("should throw an error if project agreement is not found", async () => {
      const mockTransfer: Partial<TransferDao> = {
        id: "test-transfer-4",
        remoteParty: "did:web:remoteparty.com"
      };

      jest
        .spyOn(transferHandler, "getTransferBySecret")
        .mockResolvedValue(mockTransfer as TransferDao);

      const finalizationMessage: ProjectAgreementFinalizationMessage = {
        projectId: "non-existent-project",
        hash: "finalized-hash-value",
        signatures: {},
        offer: {
          issuerId: "did:web:remoteparty.com",
          preAuthorizedCode: "test-pre-auth-code",
          credentialType: ["ProjectAgreementCredential"]
        }
      };

      await expect(
        projectAgreementsService.handleFinalizationMessage(
          finalizationMessage,
          "Bearer test-token"
        )
      ).rejects.toThrow(
        "Project Agreement with projectId non-existent-project not found"
      );
    });
  });
});
