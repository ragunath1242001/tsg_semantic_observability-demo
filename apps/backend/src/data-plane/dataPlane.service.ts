import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DataPlaneRequestResponseDto, DataPlaneCreation, DataPlaneDetailsDto, DataPlaneTransferDto} from "@libs/dtos";
import { Interval } from "@nestjs/schedule";
import { CatalogService } from "../dsp/catalog/catalog.service";
import { Dataset, IDataset } from "../model/dsp/catalog/catalog";
import crypto from "crypto";
import { TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { DSPClientError, DSPError } from "../utils/errors/error";
import deepEqual from "deep-equal";
import { SerializableClass } from "../model/dsp/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataPlaneDetailsDao, DataPlaneStatusDao } from "../model/data-planes/dataPlanes.dao";
import { In, Repository } from "typeorm";
import { DataPlaneDetails, DataPlaneStatus, HealthStatus } from "../model/data-planes/dataPlanes";
import { DatasetDao } from "../model/dsp/catalog/catalog.dao";


@Injectable()
export class DataPlaneService {
  private readonly axios: AxiosInstance;
  constructor(
    @InjectRepository(DataPlaneStatusDao) private readonly dataPlaneStatusRepository: Repository<DataPlaneStatusDao>,
    @InjectRepository(DataPlaneDetailsDao) private readonly dataPlaneDetailsRepository: Repository<DataPlaneDetailsDao>,
    private readonly catalogService: CatalogService) {
    this.axios = axios.create();
    this.axios.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
      if (request.data instanceof SerializableClass) {
        request.data = await request.data.serialize();
      }
      return request;
    });
  }
  private readonly logger = new Logger(this.constructor.name);

  private readonly maxHealthCheckMisses = 10;
  private static readonly pullInterval = 60000;

  async getDataPlane(identifier: string): Promise<DataPlaneStatus| undefined> {
    const dataPlane = await this.dataPlaneStatusRepository.findOneBy({identifier: identifier});
    if (!dataPlane) {
      return undefined
    } else {
      return new DataPlaneStatus(dataPlane)
    }
  }
  async getDataPlaneDetails(identifier: string): Promise<DataPlaneDetailsDao| undefined> {
    const dataPlaneDetails = await this.dataPlaneDetailsRepository.findOneBy({identifier: identifier});
    if (!dataPlaneDetails) {
      // TODO is DSPError a good error here or do we need a dataplane error of some kind?
      throw new DSPError(`Dataplane details with identifier ${identifier} not found`, HttpStatus.NOT_FOUND)
    } else {
      return dataPlaneDetails
    }
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
    await this.dataPlaneStatusRepository.save(dataPlaneStatus);
    switch(dataPlane.catalogSynchronization) {
      case "push": await this.healthCheck(dataPlaneStatus); break;
      case "pull": await this.pullCatalog(dataPlaneStatus); break;
    }
    return dataPlaneDetails;
  }

  async updateDataPlane(dataPlaneDetails: DataPlaneDetailsDto): Promise<DataPlaneDetails | undefined> {
    const dataPlane = await this.dataPlaneStatusRepository.findOneBy({identifier: dataPlaneDetails.identifier});
    if (!dataPlane) {
      // TODO is DSPError a good error here or do we need a dataplane error of some kind?
      throw new DSPError(`Dataplane with identifier ${dataPlaneDetails.identifier} not found`, HttpStatus.NOT_FOUND)
    } else {
      dataPlane.modified = new Date();
      await this.dataPlaneDetailsRepository.update({identifier: dataPlaneDetails.identifier},{
        ...dataPlaneDetails
      })
      await this.dataPlaneStatusRepository.update({identifier: dataPlane.identifier}, dataPlane)
      switch(dataPlane.details.catalogSynchronization) {
        case "push": await this.healthCheck(dataPlane); break;
        case "pull": await this.pullCatalog(dataPlane); break;
      }
      return await this.getDataPlaneDetails(dataPlaneDetails.identifier);
    }
  }

  async updateCatalog(identifier: string, dataset: Dataset, etag?: string): Promise<Dataset | undefined> {
    const dataPlane = await this.dataPlaneStatusRepository.findOneBy({identifier: identifier});
    let addedDataset: DatasetDao = new DatasetDao()
    if (!dataPlane) {
      // TODO is DSPError a good error here or do we need a dataplane error of some kind?
      throw new DSPError(`Dataplane with identifier ${identifier} not found`, HttpStatus.NOT_FOUND)
    } else {
      if (dataPlane.dataset) {
        this.logger.log(`Updating dataset for dataplane ${identifier}`)
        const resp = await this.catalogService.updateDataset(dataPlane.dataset?.id, dataset);
        if (resp) {
          addedDataset = resp
        }
      } else {
        this.logger.log(`Adding dataset for dataplane ${identifier}`)
        const resp = await this.catalogService.addDataset(dataset);
        if (resp) {
          addedDataset = resp
        }
      }
      // TODO: Should we update modified when the catalog changes?
      // dataPlane.modified = new Date();
      dataPlane._dataset = addedDataset;
      await this.dataPlaneStatusRepository.update({identifier: identifier}, dataPlane)
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
      const datasetJson = await this.axios.get<IDataset>(`${dataPlaneStatus.details.managementAddress}/catalog`, requestConfig);
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
      this.logger.log(new DSPClientError(`Error pulling catalog for data plane ${dataPlaneStatus.identifier}`, err).message);
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
      const datasetJson = await this.axios.get<void>(`${dataPlaneStatus.details.managementAddress}/health`, requestConfig);
      if (datasetJson.status === 200) {
        await this.updateHealth(dataPlaneStatus, HealthStatus.HEALTHY);
      } else {
        await this.updateHealth(dataPlaneStatus, HealthStatus.ERRONEOUS);
      }
    } catch (err) {
      this.logger.log(new DSPClientError(`Error in health check for data plane ${dataPlaneStatus.identifier}`, err).message);
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
        this.logger.log(`Data plane with identifier ${dataPlaneStatus.identifier} is unresponsive for ${dataPlaneStatus.missedHealthChecks * DataPlaneService.pullInterval / 1000} seconds, its catalog is deregistered.`)
        await this.catalogService.removeDataset(dataPlaneStatus.dataset.id);
        dataPlaneStatus.dataset = undefined;
      }
    }

  }

  async requestTransfer(requestDetail: TransferRequestMessage, processId: string, role: "provider" | "consumer"): Promise<DataPlaneTransferDto> {
    const dataPlanes = await this.dataPlaneDetailsRepository.findBy({dataplaneType: requestDetail.format, role: In([role, 'both'])});
    if (dataPlanes.length === 0) {
      throw Error(`Dataplane for type '${requestDetail.format}' cannot be found`);
    }
    for (const dataPlane of dataPlanes) {
      try {
        const requestConfig: AxiosRequestConfig = {
          headers: {
            Authorization: `Bearer ${dataPlane.managementToken}`
          }
        }
        const dataPlaneRequestResponse = await this.axios.post<DataPlaneRequestResponseDto>(`${dataPlane.managementAddress}/transfer/request/${role}?processId=${processId}`, requestDetail, requestConfig);
        if (dataPlaneRequestResponse.data.accepted) {
          return {
            dataPlaneIdentifier: dataPlane.identifier,
            endpointType: dataPlane.dataplaneType,
            ...dataPlaneRequestResponse.data
          };
        }
      } catch (err) {
        this.logger.log(new DSPClientError("Error requesting transfer", err).message);
      }
    }
    throw Error("None of the dataplanes did accept the transfer request message");
  }

  async startTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferStartMessage: TransferStartMessage): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await this.axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/start`, transferStartMessage, requestConfig);
    } catch (err) {
      throw new DSPClientError("Error starting transfer", err);
    }
  }
  async completeTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferCompletionMessage: TransferCompletionMessage): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await this.axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/complete`, transferCompletionMessage, requestConfig);
    } catch (err) {
      throw new DSPClientError("Error completeing transfer", err);
    }
  }
  async terminateTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferTerminationMessage: TransferTerminationMessage): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await this.axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/terminate`, transferTerminationMessage, requestConfig);
    } catch (err) {
      throw new DSPClientError("Error terminateing transfer", err);
    }
  }
  async suspendTransfer(dataPlaneTransfer: DataPlaneTransferDto, transferSuspensionMessage: TransferSuspensionMessage): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(dataPlaneTransfer.dataPlaneIdentifier);
    if (dataPlane === undefined) {
      throw Error(`Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`);
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`
        }
      }
      await this.axios.post(`${dataPlane.managementAddress}/transfer/${dataPlaneTransfer.identifier}/suspend`, transferSuspensionMessage, requestConfig);
    } catch (err) {
      throw new DSPClientError("Error suspending transfer", err);
    }
  }

  @Interval("catalogPull", DataPlaneService.pullInterval)
  async pullCatalogs() {
    const detailsrepo = await this.dataPlaneStatusRepository.
    createQueryBuilder()
    .leftJoinAndSelect(
      "dataplanedetails", 
      "details", 
      "details.identifier = detaplanedetails.identifier")
      .where({"details.catalogSynchronization":"pull"})
      .getMany()
    const dataPlanePromises = detailsrepo.map(dataPlane => this.pullCatalog(dataPlane));
    await Promise.all(dataPlanePromises);
  }
  
  @Interval("healthCheck", DataPlaneService.pullInterval)
  async healthChecks() {
    const detailsrepo = await this.dataPlaneStatusRepository.
    createQueryBuilder()
    .leftJoinAndSelect(
      "dataplanedetails", 
      "details", 
      "details.identifier = detaplanedetails.identifier")
      .where({"details.catalogSynchronization":"push"})
      .getMany()
    const dataPlanePromises = detailsrepo.map(dataPlane => this.healthCheck(dataPlane));
    await Promise.all(dataPlanePromises);
  }
}