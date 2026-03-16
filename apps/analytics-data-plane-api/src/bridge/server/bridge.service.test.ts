import { HttpStatus } from "@nestjs/common";
import type {
  BridgeCreateAlgorithmEventDto,
  BridgeDeleteDatasetsDto,
  BridgeJobStatusUpdateDto,
  BridgeUpsertDatasetsDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  CatalogClientService,
  DataPlaneError
} from "@tsg-dsp/common-data-plane-api";
import type { DatasetDto } from "@tsg-dsp/common-dsp";
import { vi } from "vitest";

import type { AlgorithmInstancesService } from "../../algorithm-instances/algorithm-instances.service.js";
import type { DataPlaneService } from "../../dataplane/dataplane.service.js";
import type { EventsService } from "../../events/events.service.js";
import { BridgeService } from "./bridge.service.js";

function createBridgeService(opts?: {
  dataplaneService?: Partial<DataPlaneService>;
  catalogPublisher?: string;
}) {
  const algorithmInstances = {
    updateStatus: vi.fn()
  } as unknown as AlgorithmInstancesService;

  const events = {
    createAlgorithmEventFromBridge: vi.fn().mockResolvedValue({ id: "ev-1" }),
    uploadAlgorithmEventDataFromBridge: vi.fn().mockResolvedValue(undefined)
  } as unknown as EventsService;

  const catalog = {
    getOwnCatalog: vi.fn().mockResolvedValue({
      publisher: opts?.catalogPublisher ?? "did:web:self"
    })
  } as unknown as CatalogClientService;

  const dataplaneService = opts?.dataplaneService
    ? (opts.dataplaneService as DataPlaneService)
    : undefined;

  const service = new BridgeService(
    algorithmInstances,
    events,
    catalog,
    dataplaneService
  );

  return { service, algorithmInstances, events, catalog, dataplaneService };
}

describe("BridgeService", () => {
  describe("clientUpsertDatasets", () => {
    it("throws NOT_IMPLEMENTED when dataplaneService is absent", async () => {
      const { service } = createBridgeService();
      const body: BridgeUpsertDatasetsDto = {
        dataset: { "@id": "urn:uuid:ds-1" } as DatasetDto
      };

      await expect(service.clientUpsertDatasets(body)).rejects.toThrow(
        DataPlaneError
      );
    });

    it("ignores datasets without @id", async () => {
      const dp = {
        getDataset: vi.fn(),
        updateDataset: vi.fn(),
        addDataset: vi.fn()
      };
      const { service } = createBridgeService({ dataplaneService: dp as any });
      const body: BridgeUpsertDatasetsDto = {
        dataset: {} as DatasetDto
      };

      await service.clientUpsertDatasets(body);
      expect(dp.getDataset).not.toHaveBeenCalled();
      expect(dp.addDataset).not.toHaveBeenCalled();
    });

    it("updates existing dataset when found", async () => {
      const existingDataset = { "@id": "urn:uuid:ds-1", title: "old" };
      const dp = {
        getDataset: vi.fn().mockResolvedValue(existingDataset),
        updateDataset: vi.fn().mockResolvedValue(undefined),
        addDataset: vi.fn()
      };
      const { service } = createBridgeService({ dataplaneService: dp as any });

      const body: BridgeUpsertDatasetsDto = {
        dataset: { "@id": "urn:uuid:ds-1", title: "new" } as DatasetDto
      };

      await service.clientUpsertDatasets(body);
      expect(dp.getDataset).toHaveBeenCalledWith("urn:uuid:ds-1");
      expect(dp.updateDataset).toHaveBeenCalled();
      expect(dp.addDataset).not.toHaveBeenCalled();
    });

    it("creates new dataset when NOT_FOUND", async () => {
      const dp = {
        getDataset: vi
          .fn()
          .mockRejectedValue(
            new DataPlaneError("not found", HttpStatus.NOT_FOUND)
          ),
        updateDataset: vi.fn(),
        addDataset: vi.fn().mockResolvedValue(undefined)
      };
      const { service } = createBridgeService({ dataplaneService: dp as any });

      const body: BridgeUpsertDatasetsDto = {
        dataset: { "@id": "urn:uuid:ds-new" } as DatasetDto
      };

      await service.clientUpsertDatasets(body);
      expect(dp.addDataset).toHaveBeenCalled();
      expect(dp.updateDataset).not.toHaveBeenCalled();
    });

    it("rethrows non-NOT_FOUND errors from getDataset", async () => {
      const dp = {
        getDataset: vi
          .fn()
          .mockRejectedValue(
            new DataPlaneError("forbidden", HttpStatus.FORBIDDEN)
          ),
        updateDataset: vi.fn(),
        addDataset: vi.fn()
      };
      const { service } = createBridgeService({ dataplaneService: dp as any });

      const body: BridgeUpsertDatasetsDto = {
        dataset: { "@id": "urn:uuid:ds-err" } as DatasetDto
      };

      await expect(service.clientUpsertDatasets(body)).rejects.toThrow(
        DataPlaneError
      );
    });
  });

  describe("clientDeleteDatasets", () => {
    it("throws NOT_IMPLEMENTED when dataplaneService is absent", async () => {
      const { service } = createBridgeService();
      const body: BridgeDeleteDatasetsDto = { datasetId: "urn:uuid:ds-1" };

      await expect(service.clientDeleteDatasets(body)).rejects.toThrow(
        DataPlaneError
      );
    });

    it("deletes dataset via dataplaneService", async () => {
      const dp = {
        deleteDataset: vi.fn().mockResolvedValue(undefined)
      };
      const { service } = createBridgeService({ dataplaneService: dp as any });
      const body: BridgeDeleteDatasetsDto = { datasetId: "urn:uuid:ds-1" };

      await service.clientDeleteDatasets(body);
      expect(dp.deleteDataset).toHaveBeenCalledWith("urn:uuid:ds-1");
    });
  });

  describe("clientPushJobStatus", () => {
    it("delegates to algorithmInstances.updateStatus", async () => {
      const { service, algorithmInstances } = createBridgeService();
      const body: BridgeJobStatusUpdateDto = {
        algorithmInstanceId: "inst-1",
        status: "running",
        observedAt: new Date(),
        jobName: "job-a"
      };

      await service.clientPushJobStatus(body);
      expect(algorithmInstances.updateStatus).toHaveBeenCalledWith(
        "inst-1",
        "running",
        { observedAt: body.observedAt, jobName: "job-a" }
      );
    });
  });

  describe("clientCreateAlgorithmEvent", () => {
    it("delegates to events.createAlgorithmEventFromBridge", async () => {
      const { service, events } = createBridgeService();
      const body: BridgeCreateAlgorithmEventDto = {
        algorithmInstanceId: "inst-1",
        event: {
          eventId: "ev-1",
          name: "metric",
          number: 1,
          timestamp: new Date().toISOString()
        }
      };

      const result = await service.clientCreateAlgorithmEvent(body);
      expect(events.createAlgorithmEventFromBridge).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1",
        createEvent: body.event
      });
      expect(result).toEqual({ id: "ev-1" });
    });
  });

  describe("clientUploadAlgorithmEventData", () => {
    it("delegates to events.uploadAlgorithmEventDataFromBridge", async () => {
      const { service, events } = createBridgeService();
      const eventData = Buffer.from("binary-data");

      await service.clientUploadAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData
      });

      expect(events.uploadAlgorithmEventDataFromBridge).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData
      });
    });

    it("passes undefined eventData gracefully", async () => {
      const { service, events } = createBridgeService();

      await service.clientUploadAlgorithmEventData({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: undefined
      });

      expect(events.uploadAlgorithmEventDataFromBridge).toHaveBeenCalledWith({
        algorithmInstanceId: "inst-1",
        eventId: "ev-1",
        eventData: undefined
      });
    });
  });
});
