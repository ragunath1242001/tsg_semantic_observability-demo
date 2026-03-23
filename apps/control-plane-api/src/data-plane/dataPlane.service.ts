import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AuthClientService,
  ClientInfo,
  getOwnershipFieldsFromClient,
  Paginated,
  PaginationOptionsDto,
  promiseMap
} from "@tsg-dsp/common-api";
import {
  DataPlaneCreation,
  DataPlaneDetailsDto,
  DataPlaneRequestResponseDto,
  DataPlaneTransferDto,
  DatasetDto
} from "@tsg-dsp/common-dsp";
import {
  Catalog,
  DataPlane,
  DataPlaneStatus,
  Dataset,
  HealthStatus,
  ICatalog,
  SerializableClass,
  TransferCompletionMessage,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage
} from "@tsg-dsp/common-dsp";
import {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig
} from "axios";
import crypto from "crypto";
import deepEqual from "deep-equal";
import { FindOptionsWhere, In, Repository } from "typeorm";

import { CatalogService } from "../dsp/catalog/catalog.service.js";
import { DatasetDao } from "../model/catalog.dao.js";
import { DataPlaneDao } from "../model/dataPlanes.dao.js";
import { AgreementService } from "../policy/agreement.service.js";
import { DSPClientError, DSPError } from "../utils/errors/error.js";

@Injectable()
export class DataPlaneService {
  private readonly axios: AxiosInstance;
  constructor(
    @InjectRepository(DataPlaneDao)
    private readonly dataPlaneRepository: Repository<DataPlaneDao>,
    private readonly catalogService: CatalogService,
    private readonly authClientService: AuthClientService,
    private readonly agreementService: AgreementService
  ) {
    this.axios = authClientService.axiosInstance();
    this.axios.interceptors.request.use(
      async (request: InternalAxiosRequestConfig) => {
        if (request.data instanceof SerializableClass) {
          request.data = await request.data.serialize();
        }
        return request;
      }
    );
  }
  private readonly logger = new Logger(this.constructor.name);

  private readonly maxHealthCheckMisses = 10;
  private static readonly pullInterval = 60000;

  async getDataPlanes(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<DataPlaneDetailsDto[]>> {
    const [dataPlanes, itemCount] = await this.dataPlaneRepository.findAndCount(
      {
        order: {
          [paginationOptions.order_by]: paginationOptions.order
        },
        relations: {
          _datasets: false
        },
        skip: paginationOptions.skip,
        take: paginationOptions.take
      }
    );
    if (!dataPlanes) {
      throw new DSPError(`No dataplanes found.`, HttpStatus.NOT_FOUND).andLog(
        this.logger,
        "warn"
      );
    } else {
      return {
        data: await Promise.all(
          dataPlanes.map(async (dataplane) => {
            const { _datasets, datasets: _, ...dataplaneDetails } = dataplane;
            return dataplaneDetails;
          })
        ),
        total: itemCount
      };
    }
  }

  async getDataPlane(id: string): Promise<DataPlaneStatus> {
    const dataPlane = await this.dataPlaneRepository.findOne({
      where: { id: id },
      select: {
        id: true,
        created: true,
        modified: true,
        health: true,
        missedHealthChecks: true,
        etag: true
      }
    });
    if (!dataPlane) {
      throw new DSPError(
        `Dataplane details with id ${id} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    } else {
      return new DataPlaneStatus(dataPlane);
    }
  }
  async getDataPlaneDetails(id: string): Promise<DataPlaneDao> {
    const dataPlaneDetails = await this.dataPlaneRepository.findOneBy({
      id: id
    });
    if (!dataPlaneDetails) {
      // TODO is DSPError a good error here or do we need a dataplane error of some kind?
      throw new DSPError(
        `Dataplane details with id ${id} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    } else {
      return dataPlaneDetails;
    }
  }

  async addDataPlane(
    dataPlaneCreation: DataPlaneCreation,
    client?: ClientInfo
  ): Promise<DataPlaneDetailsDto> {
    const dataPlane: DataPlane = {
      id: dataPlaneCreation.id || `urn:uuid:${crypto.randomUUID()}`,
      title: dataPlaneCreation.title,
      created: new Date(),
      modified: new Date(),
      health: HealthStatus.UNKNOWN,
      missedHealthChecks: 0,
      dataplaneType: dataPlaneCreation.dataplaneType,
      endpointPrefix: dataPlaneCreation.endpointPrefix,
      callbackAddress: dataPlaneCreation.callbackAddress,
      managementAddress: dataPlaneCreation.managementAddress,
      catalogSynchronization: dataPlaneCreation.catalogSynchronization,
      role: dataPlaneCreation.role
    };
    const dataPlaneDao = await this.dataPlaneRepository.save(
      this.dataPlaneRepository.create({
        ...dataPlane,
        ...getOwnershipFieldsFromClient(client)
      })
    );
    this.logger.debug(`Added dataplane ${dataPlane.id}`);
    switch (dataPlaneCreation.catalogSynchronization) {
      case "push":
        await this.healthCheck(dataPlaneDao);
        break;
      case "pull":
        await this.pullCatalog(dataPlaneDao);
        break;
    }
    return dataPlane;
  }

  async updateDataPlane(
    id: string,
    dataPlaneDetails: DataPlaneDetailsDto
  ): Promise<DataPlaneDetailsDto> {
    const dataPlane = await this.getDataPlaneDetails(id);
    dataPlane.modified = new Date();
    await this.dataPlaneRepository.save(
      this.dataPlaneRepository.create({
        ...dataPlane,
        ...dataPlaneDetails,
        id: id
      })
    );
    this.logger.debug(`Added dataplane ${dataPlane.id}`);
    switch (dataPlane.catalogSynchronization) {
      case "push":
        await this.healthCheck(dataPlane);
        break;
      case "pull":
        await this.pullCatalog(dataPlane);
        break;
    }
    return dataPlane;
  }

  async deleteDataplane(dataPlaneId: string) {
    const dataPlane = await this.getDataPlane(dataPlaneId);
    await this.dataPlaneRepository.delete({ id: dataPlane.id });
  }

  async getDatasets(
    dataPlaneId: string,
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<DatasetDto[]>> {
    return await this.catalogService.getDataplaneDatasets(
      dataPlaneId,
      paginationOptions
    );
  }

  async addDataset(dataPlaneId: string, dataset: Dataset): Promise<DatasetDao> {
    const dataPlane = await this.getDataPlaneDetails(dataPlaneId);
    const newDataset = await this.catalogService.addDataset(dataset, dataPlane);
    this.logger.debug(
      `Added dataset ${dataset.id} to dataplane ${dataPlaneId}`
    );
    return newDataset;
  }

  async updateDataset(
    dataPlaneId: string,
    datasetId: string,
    dataset: Dataset
  ): Promise<DatasetDao> {
    const dataPlane = await this.getDataPlaneDetails(dataPlaneId);
    const updatedDataset = await this.catalogService.updateDataset(
      datasetId,
      dataset,
      dataPlane
    );
    return updatedDataset;
  }

  async deleteDataset(dataPlaneId: string, datasetId: string): Promise<void> {
    await this.catalogService.removeDataset(datasetId);
    this.logger.debug(
      `Deleted dataset ${datasetId} from dataplane ${dataPlaneId}`
    );
  }

  async updateCatalog(
    id: string,
    catalog: Catalog,
    etag?: string
  ): Promise<Catalog> {
    const dataPlane = await this.getDataPlaneDetails(id);
    let existingDatasets = dataPlane._datasets || [];
    const datasetDaos: DatasetDao[] = [];
    for (const dataset of catalog.dataset || []) {
      if (existingDatasets.some((d) => d.id === dataset.id)) {
        this.logger.log(`Updating dataset ${dataset.id} for dataplane ${id}`);
        const resp = await this.catalogService.updateDataset(
          dataset.id,
          dataset
        );

        if (resp) {
          datasetDaos.push(resp);
          existingDatasets = existingDatasets.filter(
            (d) => d.id !== dataset.id
          );
        }
      } else {
        this.logger.log(`Adding dataset ${dataset.id} for dataplane ${id}`);
        const resp = await this.catalogService.addDataset(dataset);
        if (resp) {
          datasetDaos.push(resp);
        }
      }
    }
    for (const dataset of existingDatasets) {
      await this.catalogService.removeDataset(dataset.id);
    }
    dataPlane._datasets = datasetDaos;
    if (etag) {
      dataPlane.etag = etag;
    }
    await this.dataPlaneRepository.save(dataPlane);
    return catalog;
  }

  private async authorizationToken(): Promise<string | undefined> {
    const token = await this.authClientService.getToken();
    if (token) {
      return `Bearer ${token}`;
    } else {
      return undefined;
    }
  }

  async pullCatalog(dataPlaneStatus: DataPlaneDao) {
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: await this.authorizationToken(),
          "If-None-Match": dataPlaneStatus.etag
        }
      };
      const catalogJson = await this.axios.get<ICatalog>(
        `${dataPlaneStatus.managementAddress}/catalog`,
        requestConfig
      );
      try {
        if (catalogJson.status === 200) {
          const catalog = new Catalog(catalogJson.data);
          if (!deepEqual(catalog.dataset, dataPlaneStatus.datasets)) {
            this.updateCatalog(
              dataPlaneStatus.id,
              catalog,
              catalogJson.headers["ETag"]
            );
          }
        }
        await this.updateHealth(dataPlaneStatus, HealthStatus.HEALTHY);
      } catch (_) {
        await this.updateHealth(dataPlaneStatus, HealthStatus.ERRONEOUS);
      }
    } catch (err) {
      this.logger.log(
        new DSPClientError(
          `Error pulling catalog for data plane ${dataPlaneStatus.id}`,
          err
        ).message
      );
      await this.updateHealth(dataPlaneStatus, HealthStatus.UNRESPONSIVE);
    }
  }

  async healthCheck(dataPlaneStatus: DataPlaneDao) {
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: await this.authorizationToken()
        }
      };
      const datasetJson = await this.axios.get<void>(
        `${dataPlaneStatus.managementAddress}/health`,
        requestConfig
      );
      if (datasetJson.status === 200) {
        await this.updateHealth(dataPlaneStatus, HealthStatus.HEALTHY);
      } else {
        await this.updateHealth(dataPlaneStatus, HealthStatus.ERRONEOUS);
      }
    } catch (err) {
      this.logger.log(
        new DSPClientError(
          `Error in health check for data plane ${dataPlaneStatus.id}`,
          err
        ).message
      );
      await this.updateHealth(dataPlaneStatus, HealthStatus.UNRESPONSIVE);
    }
  }

  private async updateHealth(
    dataPlane: DataPlaneDao,
    healthStatus: HealthStatus
  ) {
    switch (healthStatus) {
      case HealthStatus.HEALTHY:
        dataPlane.health = HealthStatus.HEALTHY;
        dataPlane.missedHealthChecks = 0;
        break;
      case HealthStatus.UNRESPONSIVE:
        dataPlane.health = HealthStatus.UNRESPONSIVE;
        dataPlane.missedHealthChecks += 1;
        break;
      case HealthStatus.ERRONEOUS:
        dataPlane.health = HealthStatus.ERRONEOUS;
        dataPlane.missedHealthChecks += 1;
        break;
      case HealthStatus.EXITED:
        dataPlane.health = HealthStatus.EXITED;
        dataPlane.missedHealthChecks = 0;
        break;
      case HealthStatus.UNKNOWN:
        dataPlane.health = HealthStatus.UNKNOWN;
        dataPlane.missedHealthChecks += 1;
        break;
    }
    if (dataPlane.missedHealthChecks > this.maxHealthCheckMisses) {
      if (dataPlane.datasets !== undefined) {
        this.logger.log(
          `Data plane with id ${dataPlane.id} is unresponsive for ${
            (dataPlane.missedHealthChecks * DataPlaneService.pullInterval) /
            1000
          } seconds, its catalog is deregistered.`
        );
        await promiseMap(dataPlane.datasets, (dataset) =>
          this.catalogService.removeDataset(dataset.id)
        );
      }
    }
  }

  async requestTransfer(
    requestDetail: TransferRequestMessage,
    processId: string,
    role: "provider" | "consumer",
    remoteParty: string,
    dataPlaneid?: string
  ): Promise<DataPlaneTransferDto> {
    const agreement = await this.agreementService.getAgreement(
      requestDetail.agreementId
    );
    const findOptions: FindOptionsWhere<DataPlaneDao> = {
      id: dataPlaneid,
      dataplaneType: requestDetail.format,
      role: In([role, "both"])
    };
    if (role === "provider") {
      findOptions._datasets = {
        id: agreement.target
      };
    }
    const dataPlanes = await this.dataPlaneRepository.findBy(findOptions);
    if (dataPlanes.length === 0) {
      throw new DSPError(
        `Dataplane for type '${requestDetail.format}' cannot be found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }

    for (const dataPlane of dataPlanes) {
      try {
        const requestConfig: AxiosRequestConfig = {
          headers: {
            Authorization: await this.authorizationToken(),
            "X-Remote-Party": remoteParty,
            "X-Dataset-Id": agreement.target
          }
        };
        this.logger.debug(
          `Requesting transfer at ${dataPlane.id} at ${dataPlane.managementAddress} for ${remoteParty} with authorization: ${requestConfig.headers?.Authorization}`
        );
        const dataPlaneRequestResponse =
          await this.axios.post<DataPlaneRequestResponseDto>(
            `${dataPlane.managementAddress}/transfers/request/${role}?processId=${processId}`,
            requestDetail.serialize(),
            requestConfig
          );
        if (dataPlaneRequestResponse.data.accepted) {
          this.logger.debug(`Dataplane ${dataPlane.id} accepted transfer`);
          return {
            dataPlaneId: dataPlane.id,
            endpointType: dataPlane.dataplaneType,
            ...dataPlaneRequestResponse.data
          };
        }
      } catch (err) {
        this.logger.log(
          new DSPClientError("Error requesting transfer", err).message
        );
      }
    }
    throw new DSPError(
      "None of the dataplanes did accept the transfer request message",
      HttpStatus.BAD_REQUEST
    ).andLog(this.logger, "warn");
  }

  async startTransfer(
    dataPlaneTransfer: DataPlaneTransferDto,
    transferStartMessage: TransferStartMessage
  ): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(
      dataPlaneTransfer.dataPlaneId
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with id ${dataPlaneTransfer.dataPlaneId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: await this.authorizationToken()
        }
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.id}/start`,
        transferStartMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.id} started`);
    } catch (err) {
      throw new DSPClientError("Error starting transfer", err).andLog(
        this.logger,
        "warn"
      );
    }
  }
  async completeTransfer(
    dataPlaneTransfer: DataPlaneTransferDto,
    transferCompletionMessage: TransferCompletionMessage
  ): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(
      dataPlaneTransfer.dataPlaneId
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with id ${dataPlaneTransfer.dataPlaneId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: await this.authorizationToken()
        }
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.id}/completion`,
        transferCompletionMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.id} completed`);
    } catch (err) {
      throw new DSPClientError("Error completeing transfer", err).andLog(
        this.logger,
        "warn"
      );
    }
  }
  async terminateTransfer(
    dataPlaneTransfer: DataPlaneTransferDto,
    transferTerminationMessage: TransferTerminationMessage
  ): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(
      dataPlaneTransfer.dataPlaneId
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with id ${dataPlaneTransfer.dataPlaneId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: await this.authorizationToken()
        }
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.id}/termination`,
        transferTerminationMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.id} terminated`);
    } catch (err) {
      throw new DSPClientError("Error terminateing transfer", err).andLog(
        this.logger,
        "warn"
      );
    }
  }
  async suspendTransfer(
    dataPlaneTransfer: DataPlaneTransferDto,
    transferSuspensionMessage: TransferSuspensionMessage
  ): Promise<void> {
    const dataPlane = await this.getDataPlaneDetails(
      dataPlaneTransfer.dataPlaneId
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with id ${dataPlaneTransfer.dataPlaneId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: await this.authorizationToken()
        }
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.id}/suspension`,
        transferSuspensionMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.id} suspended`);
    } catch (err) {
      throw new DSPClientError("Error suspending transfer", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  @Interval("catalogPull", DataPlaneService.pullInterval)
  async pullCatalogs() {
    const dataPlanes = await this.dataPlaneRepository.find({
      where: {
        catalogSynchronization: "pull"
      }
    });
    const dataPlanePromises = dataPlanes.map((dataPlane) =>
      this.pullCatalog(dataPlane)
    );
    await Promise.allSettled(dataPlanePromises);
  }

  @Interval("healthCheck", DataPlaneService.pullInterval)
  async healthChecks() {
    const dataPlanes = await this.dataPlaneRepository.find({
      where: {
        catalogSynchronization: "push"
      }
    });
    const dataPlanePromises = dataPlanes.map((dataPlane) =>
      this.healthCheck(dataPlane)
    );
    await Promise.allSettled(dataPlanePromises);
  }
}
