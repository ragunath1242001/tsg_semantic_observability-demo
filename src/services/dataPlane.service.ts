import { Injectable } from "@nestjs/common";
import { DataPlaneRequestResponseDto, DataPlaneCreation, DataPlaneDetailsDto, DataPlaneTransferDto } from "../model/data-planes/dataPlanes.dto";
import { Cron, CronExpression, Interval } from "@nestjs/schedule";
import { CatalogService } from "./dsp/catalog.service";
import { Dataset, IDataset } from "../model/dsp/catalog/catalog";
import crypto from "crypto";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import axios, { AxiosRequestConfig } from "axios";
import { DSPAxiosError } from "../utils/errors/dspAxiosError";
import deepEqual from "deep-equal";


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
  etag?: string
}

@Injectable()
export class DataPlaneService {
  constructor(private readonly catalogService: CatalogService) {}
  private dataPlanes: DataPlaneStatus[] = []

  private readonly maxHealthCheckMisses = 10;
  private static readonly pullInterval = 60000;

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

  async updateCatalog(identifier: string, dataset: Dataset, etag?: string): Promise<Dataset | undefined> {
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
      if (etag) {
        dataPlane.etag = etag;
      }
      return dataset;
    }
  }

  async pullCatalog(dataPlaneStatus: DataPlaneStatus) {
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlaneStatus.details.managementToken}`,
          'If-None-Match': dataPlaneStatus.etag
        }
      }
      const datasetJson = await axios.get<IDataset>(`${dataPlaneStatus.details.managementAddress}/catalog`, requestConfig);
      try {
        if (datasetJson.status === 200) {
          const dataset = new Dataset(datasetJson.data);
          if (!deepEqual(dataset, dataPlaneStatus.dataset)) {
            this.updateCatalog(dataPlaneStatus.identifier, dataset, datasetJson.headers['ETag']);
          }
        }
        await this.updateHealth(dataPlaneStatus, HealthStatus.HEALTHY);
      } catch (err) {
        await this.updateHealth(dataPlaneStatus, HealthStatus.ERRONEOUS);
      }
    } catch (err) {
      console.log(new DSPAxiosError(`Error pulling catalog for data plane ${dataPlaneStatus.identifier}`, err).message);
      await this.updateHealth(dataPlaneStatus, HealthStatus.UNRESPONSIVE);
    }
  }

  async healthCheck(dataPlaneStatus: DataPlaneStatus) {
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlaneStatus.details.managementToken}`
        }
      }
      const datasetJson = await axios.get<void>(`${dataPlaneStatus.details.managementAddress}/health`, requestConfig);
      if (datasetJson.status === 200) {
        await this.updateHealth(dataPlaneStatus, HealthStatus.HEALTHY);
      } else {
        await this.updateHealth(dataPlaneStatus, HealthStatus.ERRONEOUS);
      }
    } catch (err) {
      console.log(new DSPAxiosError(`Error pulling catalog for data plane ${dataPlaneStatus.identifier}`, err).message);
      await this.updateHealth(dataPlaneStatus, HealthStatus.UNRESPONSIVE);
    }
  }

  private async updateHealth(dataPlaneStatus: DataPlaneStatus, healthStatus: HealthStatus) {
    switch(healthStatus) {
      case HealthStatus.HEALTHY:
        dataPlaneStatus.health = HealthStatus.HEALTHY;
        dataPlaneStatus.missedHealthChecks = 0;
        break;
      case HealthStatus.UNRESPONSIVE:
        dataPlaneStatus.health = HealthStatus.UNRESPONSIVE;
        dataPlaneStatus.missedHealthChecks += 1;
        break;
      case HealthStatus.ERRONEOUS:
        dataPlaneStatus.health = HealthStatus.ERRONEOUS;
        dataPlaneStatus.missedHealthChecks += 1;
        break;
      case HealthStatus.EXITED:
        dataPlaneStatus.health = HealthStatus.EXITED;
        dataPlaneStatus.missedHealthChecks = 0;
        break;
      case HealthStatus.UNKNOWN:
        dataPlaneStatus.health = HealthStatus.UNKNOWN;
        dataPlaneStatus.missedHealthChecks += 1;
        break;
    }
    if (dataPlaneStatus.missedHealthChecks > this.maxHealthCheckMisses) {
      if (dataPlaneStatus.dataset !== undefined) {
        console.log(`Data plane with identifier ${dataPlaneStatus.identifier} is unresponsive for ${dataPlaneStatus.missedHealthChecks * DataPlaneService.pullInterval / 1000} seconds, its catalog is deregistered.`)
        await this.catalogService.removeDataset(dataPlaneStatus.dataset.id);
        dataPlaneStatus.dataset = undefined;
      }
    }

  }

  async requestTransfer(requestDetail: TransferRequestMessage, role: "provider" | "consumer"): Promise<DataPlaneTransferDto> {
    const dataPlanes = this.dataPlanes.filter(dataPlane => dataPlane.details.dataplaneType === requestDetail.format && (dataPlane.details.role === role || dataPlane.details.role === "both"));
    if (dataPlanes.length === 0) {
      throw Error(`Dataplane for type '${requestDetail.format}' cannot be found`);
    }
    for (const dataPlane of dataPlanes) {
      try {
        const requestConfig: AxiosRequestConfig = {
          headers: {
            Authorization: `Bearer ${dataPlane.details.managementToken}`
          }
        }
        const dataPlaneRequestResponse = await axios.post<DataPlaneRequestResponseDto>(`${dataPlane.details.managementAddress}/transfer/request/${role}`, requestDetail, requestConfig);
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
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/start`, transferStartMessage, requestConfig);
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
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/complete`, transferCompletionMessage, requestConfig);
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
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/terminate`, transferTerminationMessage, requestConfig);
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
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/suspend`, transferSuspensionMessage, requestConfig);
    } catch (err) {
      throw new DSPAxiosError("Error suspending transfer", err);
    }
  }

  @Interval(DataPlaneService.pullInterval)
  async pullCatalogs() {
    const dataPlanePromises = this.dataPlanes.filter(dataPlane => dataPlane.details.catalogSynchronization === "pull").map(dataPlane => this.pullCatalog(dataPlane));
    await Promise.all(dataPlanePromises);
  }
  
  @Interval(DataPlaneService.pullInterval)
  async healthChecks() {
    const dataPlanePromises = this.dataPlanes.filter(dataPlane => dataPlane.details.catalogSynchronization === "push").map(dataPlane => this.pullCatalog(dataPlane));
    await Promise.all(dataPlanePromises);
  }
}