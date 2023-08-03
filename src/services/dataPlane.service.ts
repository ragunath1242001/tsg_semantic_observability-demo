import { Injectable } from "@nestjs/common";
import { DataPlaneRequestResponseDto, DataPlaneCreation, DataPlaneDetailsDto, DataPlaneTransferDto } from "../model/data-planes/dataPlanes.dto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CatalogService } from "./dsp/catalog.service";
import { Dataset } from "../model/dsp/catalog/catalog";
import crypto from "crypto";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import axios from "axios";
import { DSPAxiosError } from "../utils/errors/dspAxiosError";

enum HealthStatus {
  HEALTHY, UNRESPONSIVE, ERRONEOUS, EXITED, UNKNOWN
}

interface DataPlaneStatus {
  identifier: string;
  created: Date;
  modified: Date;
  details: DataPlaneDetailsDto;
  health: HealthStatus;
  missedHealthChecks: number;
  dataset?: Dataset;
}

@Injectable()
export class DataPlaneService {
  constructor(private readonly catalogService: CatalogService) {}
  private dataPlanes: DataPlaneStatus[] = []

  async getDataPlane(identifier: string): Promise<DataPlaneDetailsDto | undefined> {
    return this.dataPlanes.find(dataPlane => dataPlane.identifier === identifier)?.details;
  }

  async addDataPlane(dataPlane: DataPlaneCreation): Promise<DataPlaneDetailsDto> {
    const dataPlaneDetails: DataPlaneDetailsDto = {
      ...dataPlane,
      identifier: dataPlane.identifier || `urn:uuid:${crypto.randomUUID()}`
    }
    const dataPlaneStatus: DataPlaneStatus = {
      identifier: dataPlaneDetails.identifier,
      created: new Date(),
      modified: new Date(),
      details: dataPlaneDetails,
      health: HealthStatus.UNKNOWN,
      missedHealthChecks: 0
    }
    this.dataPlanes.push(dataPlaneStatus);
    switch(dataPlane.catalogSynchronization) {
      case "push": await this.healthCheck(dataPlaneStatus); break;
      case "pull": await this.pullCatalog(dataPlaneStatus); break;
    }
    return dataPlaneDetails;
  }

  async updateDataPlane(dataPlaneDetails: DataPlaneDetailsDto): Promise<DataPlaneDetailsDto | undefined> {
    const dataPlane = this.dataPlanes.find(dataPlane => dataPlane.identifier === dataPlaneDetails.identifier);
    if (dataPlane) {
      dataPlane.modified = new Date();
      dataPlane.details = dataPlaneDetails;
      switch(dataPlane.details.catalogSynchronization) {
        case "push": await this.healthCheck(dataPlane); break;
        case "pull": await this.pullCatalog(dataPlane); break;
      }
      return dataPlaneDetails;
    }
  }

  async updateCatalog(identifier: string, dataset: Dataset): Promise<Dataset | undefined> {
    const dataPlane = this.dataPlanes.find(dataPlane => dataPlane.identifier === identifier);
    if (dataPlane) {
      if (dataPlane.dataset) {
        this.catalogService.updateDataset(dataPlane.dataset.id, dataset);
      } else {
        this.catalogService.addDataset(dataset);
      }
      // TODO: Should we update modified when the catalog changes?
      // dataPlane.modified = new Date();
      dataPlane.dataset = dataset;
      return dataset;
    }
  }

  async pullCatalog(dataPlaneStatus: DataPlaneStatus) {
      // TODO: execute pull for catalog
      // TODO: update Dataset in CatalogService
  }

  async healthCheck(dataPlaneStatus: DataPlaneStatus) {
    // TODO: execute health check for data plane
    // TODO: update Dataset in CatalogService if to many fails
  }

  async requestTransfer(requestDetail: TransferRequestMessage, role: "provider" | "consumer"): Promise<DataPlaneTransferDto> {
    const dataPlanes = this.dataPlanes.filter(dataPlane => dataPlane.details.dataplaneType === requestDetail.format && (dataPlane.details.role === role || dataPlane.details.role === "both"));
    if (dataPlanes.length === 0) {
      throw Error(`Dataplane for type '${requestDetail.format}' cannot be found`);
    }
    for (const dataPlane of dataPlanes) {
      try {
        const dataPlaneRequestResponse = await axios.post<DataPlaneRequestResponseDto>(`${dataPlane.details.managementAddress}/request/${role}`, requestDetail);
        if (dataPlaneRequestResponse.data.accepted) {
          return {
            dataPlaneIdentifier: dataPlane.identifier,
            ...dataPlaneRequestResponse.data
          };
        }
      } catch (err) {
        console.log(new DSPAxiosError("Error requesting transfer", err).message);
      }
    }
    throw Error("None of the dataplanes did accept the transfer request message");
  }

  async startTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferStartMessage: TransferStartMessage): Promise<void> {
    const dataPlane = await this.getDataPlane(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      await axios.post(`${dataPlane.managementAddress}/start/${dataPlaneTransfer.identifier}`, transferStartMessage);
    } catch (err) {
      throw new DSPAxiosError("Error starting transfer", err);
    }
  }
  async completeTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferCompletionMessage: TransferCompletionMessage): Promise<void> {
    const dataPlane = await this.getDataPlane(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      await axios.post(`${dataPlane.managementAddress}/complete/${dataPlaneTransfer.identifier}`, transferCompletionMessage);
    } catch (err) {
      throw new DSPAxiosError("Error completeing transfer", err);
    }
  }
  async terminateTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferTerminationMessage: TransferTerminationMessage): Promise<void> {
    const dataPlane = await this.getDataPlane(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      await axios.post(`${dataPlane.managementAddress}/terminate/${dataPlaneTransfer.identifier}`, transferTerminationMessage);
    } catch (err) {
      throw new DSPAxiosError("Error terminateing transfer", err);
    }
  }
  async suspendTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferSuspensionMessage: TransferSuspensionMessage): Promise<void> {
    const dataPlane = await this.getDataPlane(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      await axios.post(`${dataPlane.managementAddress}/suspend/${dataPlaneTransfer.identifier}`, transferSuspensionMessage);
    } catch (err) {
      throw new DSPAxiosError("Error suspending transfer", err);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pullCatalogs() {
    const dataPlanePromises = this.dataPlanes.filter(dataPlane => dataPlane.details.catalogSynchronization === "pull").map(dataPlane => this.pullCatalog(dataPlane));
    await Promise.all(dataPlanePromises);
  }
  
  @Cron(CronExpression.EVERY_MINUTE)
  async healthChecks() {
    const dataPlanePromises = this.dataPlanes.filter(dataPlane => dataPlane.details.catalogSynchronization === "push").map(dataPlane => this.pullCatalog(dataPlane));
    await Promise.all(dataPlanePromises);
  }
}