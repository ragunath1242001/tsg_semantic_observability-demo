import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { DataService, Dataset, Distribution, Offer } from "@tsg-dsp/common-dsp";
import { vi } from "vitest";

import { RuntimeConfig } from "../../config.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { TransferService } from "../transfer/transfer.service.js";
import {
  NegotiationCreatedEvent,
  NegotiationUpdatedEvent
} from "./negotiation.events.js";
import { NegotiationListener } from "./negotiation.listeners.js";
import { NegotiationService } from "./negotiation.service.js";

describe("NegotiationListener", () => {
  let negotiationListener: NegotiationListener;
  let negotiationService: NegotiationService;
  let catalogService: CatalogService;
  let runtimeConfig: RuntimeConfig;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationListener,
        {
          provide: NegotiationService,
          useValue: {
            agree: vi.fn(),
            terminate: vi.fn(),
            verify: vi.fn(),
            finalize: vi.fn(),
            getNegotiation: vi.fn()
          }
        },
        {
          provide: TransferService,
          useValue: {
            initiateTransferProcess: vi.fn()
          }
        },
        {
          provide: CatalogService,
          useValue: {
            getDataset: vi.fn()
          }
        },
        {
          provide: RuntimeConfig,
          useValue: { controlPlaneInteractions: "automatic" }
        }
      ]
    }).compile();

    catalogService = module.get(CatalogService);
    negotiationService = module.get(NegotiationService);
    negotiationListener = module.get(NegotiationListener);
    runtimeConfig = module.get(RuntimeConfig);
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  const offer = new Offer({
    id: "urn:uuid:b1de3dee-169d-41db-865f-b84cce26ff00",
    assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
    assignee: "did:web:remoteparty.test",
    target: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea"
  });

  const dataset = new Dataset({
    id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
    title: "Test HTTP dataset",
    hasPolicy: [offer],
    distribution: [
      new Distribution({
        id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
        format: "tsg:HTTP",
        accessService: new DataService({
          id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
          endpointURL: "https://httpbin.org/anything"
        })
      })
    ]
  });
  describe("Negotiation created event", () => {
    it("should call agree if offer is included in policy", async () => {
      const mockEvent = new NegotiationCreatedEvent({
        id: "id123",
        datasetId: "datasetId123",
        offer: offer.serialize(),
        remoteParty: "did:web:remoteparty.test"
      });
      vi.spyOn(catalogService, "getDataset").mockResolvedValue(dataset);
      await negotiationListener.handleNegotiationCreatedEvent(mockEvent);

      expect(catalogService.getDataset).toHaveBeenCalledWith("datasetId123");
      expect(negotiationService.agree).toHaveBeenCalledWith("id123");
      expect(negotiationService.terminate).not.toHaveBeenCalled();
    });

    it("should call terminate if offer is not included in policy and controlPlaneInteractions is automatic", async () => {
      const mockEvent = new NegotiationCreatedEvent({
        id: "id123",
        datasetId: "datasetId123",
        offer: offer.serialize(),
        remoteParty: "did:web:remoteparty.test"
      });

      const otherOffer = new Offer({
        id: "urn:uuid:b1de3dee-169d-41db-865f-000000000000",
        assigner: "urn:uuid:c2165eeb-8fc3-4de8-aed0-a088a6fb48d0",
        target: "urn:uuid:b9e2af39-36a9-4e92-a02e-a05dcd94219b"
      });
      dataset.hasPolicy = [otherOffer];
      vi.spyOn(catalogService, "getDataset").mockResolvedValue(dataset);

      await negotiationListener.handleNegotiationCreatedEvent(mockEvent);
      expect(catalogService.getDataset).toHaveBeenCalledWith("datasetId123");
      expect(negotiationService.terminate).toHaveBeenCalledWith("id123");
      expect(negotiationService.agree).not.toHaveBeenCalled();
    });

    it("should do nothing if offer is not included in policy and controlPlaneInteractions is not automatic", async () => {
      runtimeConfig.controlPlaneInteractions = "manual";
      const mockEvent = new NegotiationCreatedEvent({
        id: "id123",
        datasetId: "datasetId123",
        offer: offer.serialize(),
        remoteParty: "did:web:remoteparty.test"
      });
      vi.spyOn(catalogService, "getDataset").mockResolvedValue(dataset);

      await negotiationListener.handleNegotiationCreatedEvent(mockEvent);

      expect(catalogService.getDataset).toHaveBeenCalledWith("datasetId123");
      expect(negotiationService.terminate).not.toHaveBeenCalled();
      expect(negotiationService.agree).not.toHaveBeenCalled();
      runtimeConfig.controlPlaneInteractions = "automatic";
    });

    it("should handle case where dataset is not found", async () => {
      const mockEvent = new NegotiationCreatedEvent({
        id: "id123",
        datasetId: "datasetId123",
        offer: offer.serialize(),
        remoteParty: "did:web:remoteparty.test"
      });
      vi.spyOn(catalogService, "getDataset").mockRejectedValueOnce(null);

      await negotiationListener.handleNegotiationCreatedEvent(mockEvent);

      expect(catalogService.getDataset).toHaveBeenCalledWith("datasetId123");
      expect(negotiationService.terminate).toHaveBeenCalledWith("id123");
      expect(negotiationService.agree).not.toHaveBeenCalled();
    });
  });
  describe("Negotiation agreed event", () => {
    it("should handle case where agree is called", async () => {
      const mockEvent = new NegotiationUpdatedEvent({
        processId: "processId123"
      });
      await negotiationListener.handleNegotiationAgreedEvent(mockEvent);

      expect(negotiationService.verify).toHaveBeenCalledWith("processId123");
      expect(negotiationService.finalize).not.toHaveBeenCalled();
    });
  });
  describe("Negotiation verified event", () => {
    it("should handle case where verify is called", async () => {
      const mockEvent = new NegotiationUpdatedEvent({
        processId: "processId123"
      });
      await negotiationListener.handleNegotiationVerifiedEvent(mockEvent);

      expect(negotiationService.finalize).toHaveBeenCalledWith("processId123");
      expect(negotiationService.verify).not.toHaveBeenCalled();
    });
  });
});
