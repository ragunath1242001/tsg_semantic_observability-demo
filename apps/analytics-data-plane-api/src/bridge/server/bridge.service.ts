import { HttpStatus, Injectable, Logger, Optional } from "@nestjs/common";
import {
  BridgeCreateAlgorithmEventDto,
  BridgeDeleteDatasetsDto,
  BridgeJobStatusUpdateDto,
  BridgeUpsertDatasetsDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
import { DatasetDto } from "@tsg-dsp/common-dsp";

import { AlgorithmInstancesService } from "../../algorithm-instances/algorithm-instances.service.js";
import { DataPlaneService } from "../../dataplane/dataplane.service.js";
import { EventsService } from "../../events/events.service.js";
import { mergeFileDatasetUpdate } from "../../utils/dataset-file-merge.js";
import { DataPlaneError } from "../../utils/errors/error.js";

@Injectable()
export class BridgeService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly algorithmInstances: AlgorithmInstancesService,
    private readonly events: EventsService,
    private readonly catalog: CatalogClientService,
    @Optional()
    private readonly dataplaneService?: DataPlaneService
  ) {}

  async clientUpsertDatasets(body: BridgeUpsertDatasetsDto): Promise<void> {
    if (!this.dataplaneService) {
      throw new DataPlaneError(
        "Dataset synchronization is not available in this runtime mode",
        HttpStatus.NOT_IMPLEMENTED
      );
    }

    const dataset = body.dataset;
    const datasetId = dataset["@id"];
    if (!datasetId) {
      this.logger.warn("Ignoring dataset upsert from bridge: missing @id");
      return;
    }

    let policyAssigner: string | undefined;
    try {
      const ownCatalog = await this.catalog.getOwnCatalog();
      policyAssigner = ownCatalog.publisher as string | undefined;
    } catch (_err) {
      this.logger.debug(
        `Failed to resolve catalog publisher while upserting dataset ${datasetId}`
      );
    }

    try {
      const existing = await this.dataplaneService.getDataset(datasetId);
      const merged: DatasetDto = mergeFileDatasetUpdate(existing, dataset, {
        policyAssigner
      });
      await this.dataplaneService.updateDataset(datasetId, merged);
    } catch (err) {
      if (
        err instanceof DataPlaneError &&
        err.getStatus() === HttpStatus.NOT_FOUND
      ) {
        const merged: DatasetDto = mergeFileDatasetUpdate(undefined, dataset, {
          policyAssigner
        });
        await this.dataplaneService.addDataset(merged);
        return;
      }
      throw err;
    }
  }

  async clientDeleteDatasets(body: BridgeDeleteDatasetsDto): Promise<void> {
    if (!this.dataplaneService) {
      throw new DataPlaneError(
        "Dataset synchronization is not available in this runtime mode",
        HttpStatus.NOT_IMPLEMENTED
      );
    }

    await this.dataplaneService.deleteDataset(body.datasetId);
  }

  async clientPushJobStatus(body: BridgeJobStatusUpdateDto): Promise<void> {
    await this.algorithmInstances.updateStatus(
      body.algorithmInstanceId,
      body.status,
      { observedAt: body.observedAt, jobName: body.jobName }
    );
  }

  async clientCreateAlgorithmEvent(body: BridgeCreateAlgorithmEventDto) {
    return await this.events.createAlgorithmEventFromBridge({
      algorithmInstanceId: body.algorithmInstanceId,
      createEvent: body.event
    });
  }

  async clientUploadAlgorithmEventData({
    algorithmInstanceId,
    eventId,
    eventData
  }: {
    algorithmInstanceId: string;
    eventId: string;
    eventData?: Buffer;
  }): Promise<void> {
    await this.events.uploadAlgorithmEventDataFromBridge({
      algorithmInstanceId,
      eventId,
      eventData
    });
  }
}
