import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  DataPlaneRequestResponseDto,
  DataPlaneCreation,
  DataPlaneDto,
  DataPlaneTransferDto,
} from "@libs/dtos";
import { Interval } from "@nestjs/schedule";
import { CatalogService } from "../dsp/catalog/catalog.service";
import { Dataset, IDataset } from "../model/dsp/catalog/catalog";
import crypto from "crypto";
import {
  TransferCompletionMessage,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage,
} from "../model/dsp/transfer/messages";
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { DSPClientError, DSPError } from "../utils/errors/error";
import deepEqual from "deep-equal";
import { SerializableClass } from "../model/dsp/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataPlaneDao } from "../model/data-planes/dataPlanes.dao";
import { In, Repository } from "typeorm";
import {
  DataPlane,
  DataPlaneStatus,
  HealthStatus,
} from "../model/data-planes/dataPlanes";
import { DatasetDao } from "../model/dsp/catalog/catalog.dao";
import { deserialize } from "../model/serialize";

@Injectable()
export class DataPlaneService {
  private readonly axios: AxiosInstance;
  constructor(
    @InjectRepository(DataPlaneDao)
    private readonly dataPlaneRepository: Repository<DataPlaneDao>,
    private readonly catalogService: CatalogService
  ) {
    this.axios = axios.create();
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

  async getDataPlanes(): Promise<DataPlane[]> {
    const dataPlanes = await this.dataPlaneRepository.find({});
    if (!dataPlanes) {
      throw new DSPError(`No dataplanes found.`, HttpStatus.NOT_FOUND).andLog(
        this.logger,
        "warn"
      );
    } else {
      return dataPlanes;
    }
  }

  async getDataPlane(identifier: string): Promise<DataPlaneStatus> {
    const dataPlane = await this.dataPlaneRepository.findOne({
      where: { identifier: identifier },
      select: {
        identifier: true,
        created: true,
        modified: true,
        health: true,
        missedHealthChecks: true,
        etag: true,
      },
    });
    if (!dataPlane) {
      throw new DSPError(
        `Dataplane details with identifier ${identifier} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    } else {
      return new DataPlaneStatus(dataPlane);
    }
  }
  async getDataPlaneDetails(identifier: string): Promise<DataPlaneDao> {
    const dataPlaneDetails = await this.dataPlaneRepository.findOneBy({
      identifier: identifier,
    });
    if (!dataPlaneDetails) {
      // TODO is DSPError a good error here or do we need a dataplane error of some kind?
      throw new DSPError(
        `Dataplane details with identifier ${identifier} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    } else {
      return dataPlaneDetails;
    }
  }

  async addDataPlane(
    dataPlaneCreation: DataPlaneCreation
  ): Promise<DataPlaneDto> {
    const dataPlane: DataPlane = {
      dataset: dataPlaneCreation.dataset
        ? await deserialize<Dataset>(dataPlaneCreation.dataset)
        : undefined,
      identifier:
        dataPlaneCreation.identifier || `urn:uuid:${crypto.randomUUID()}`,
      created: new Date(),
      modified: new Date(),
      health: HealthStatus.UNKNOWN,
      missedHealthChecks: 0,
      dataplaneType: dataPlaneCreation.dataplaneType,
      endpointPrefix: dataPlaneCreation.endpointPrefix,
      callbackAddress: dataPlaneCreation.callbackAddress,
      managementAddress: dataPlaneCreation.managementAddress,
      managementToken: dataPlaneCreation.managementToken,
      catalogSynchronization: dataPlaneCreation.catalogSynchronization,
      role: dataPlaneCreation.role,
    };
    await this.dataPlaneRepository.save(dataPlane);
    this.logger.debug(`Added dataplane ${dataPlane.identifier}`);
    switch (dataPlaneCreation.catalogSynchronization) {
      case "push":
        await this.healthCheck(dataPlane);
        break;
      case "pull":
        await this.pullCatalog(dataPlane);
        break;
    }
    return {
      ...dataPlane,
      dataset: await dataPlane.dataset?.serialize(),
    };
  }

  async updateDataPlane(dataPlaneDetails: DataPlaneDto): Promise<DataPlane> {
    const dataPlane = await this.getDataPlaneDetails(
      dataPlaneDetails.identifier
    );
    dataPlane.modified = new Date();
    const dataPlaneDetailsObj = {
      ...dataPlaneDetails,
      dataset: dataPlaneDetails.dataset
        ? await deserialize<Dataset>(dataPlaneDetails.dataset)
        : undefined,
    };
    await this.dataPlaneRepository.save({
      ...dataPlane,
      ...dataPlaneDetailsObj,
    });
    this.logger.debug(`Added dataplane ${dataPlane.identifier}`);
    switch (dataPlane.catalogSynchronization) {
      case "push":
        await this.healthCheck(dataPlane);
        break;
      case "pull":
        await this.pullCatalog(dataPlane);
        break;
    }
    return await this.getDataPlaneDetails(dataPlaneDetails.identifier);
  }

  async updateCatalog(
    identifier: string,
    dataset: Dataset,
    etag?: string
  ): Promise<Dataset> {
    const dataPlane = await this.getDataPlaneDetails(identifier);
    let addedDataset: DatasetDao = new DatasetDao();
    if (dataPlane.dataset) {
      this.logger.log(`Updating dataset for dataplane ${identifier}`);
      const resp = await this.catalogService.updateDataset(
        dataPlane.dataset?.id,
        dataset
      );
      if (resp) {
        addedDataset = resp;
      }
    } else {
      this.logger.log(`Adding dataset for dataplane ${identifier}`);
      const resp = await this.catalogService.addDataset(dataset);
      if (resp) {
        addedDataset = resp;
      }
    }
    // TODO: Should we update modified when the catalog changes?
    // dataPlane.modified = new Date();
    dataPlane._dataset = addedDataset;
    await this.dataPlaneRepository.update(
      { identifier: identifier },
      dataPlane
    );
    if (etag) {
      dataPlane.etag = etag;
    }
    return dataset;
  }

  async pullCatalog(dataPlaneStatus: DataPlane) {
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlaneStatus.managementToken}`,
          "If-None-Match": dataPlaneStatus.etag,
        },
      };
      const datasetJson = await this.axios.get<IDataset>(
        `${dataPlaneStatus.managementAddress}/catalog`,
        requestConfig
      );
      try {
        if (datasetJson.status === 200) {
          const dataset = new Dataset(datasetJson.data);
          if (!deepEqual(dataset, dataPlaneStatus.dataset)) {
            this.updateCatalog(
              dataPlaneStatus.identifier,
              dataset,
              datasetJson.headers["ETag"]
            );
          }
        }
        await this.updateHealth(dataPlaneStatus, HealthStatus.HEALTHY);
      } catch (err) {
        await this.updateHealth(dataPlaneStatus, HealthStatus.ERRONEOUS);
      }
    } catch (err) {
      this.logger.log(
        new DSPClientError(
          `Error pulling catalog for data plane ${dataPlaneStatus.identifier}`,
          err
        ).message
      );
      await this.updateHealth(dataPlaneStatus, HealthStatus.UNRESPONSIVE);
    }
  }

  async healthCheck(dataPlaneStatus: DataPlane) {
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlaneStatus.managementToken}`,
        },
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
          `Error in health check for data plane ${dataPlaneStatus.identifier}`,
          err
        ).message
      );
      await this.updateHealth(dataPlaneStatus, HealthStatus.UNRESPONSIVE);
    }
  }

  private async updateHealth(dataPlane: DataPlane, healthStatus: HealthStatus) {
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
      if (dataPlane.dataset !== undefined) {
        this.logger.log(
          `Data plane with identifier ${
            dataPlane.identifier
          } is unresponsive for ${
            (dataPlane.missedHealthChecks * DataPlaneService.pullInterval) /
            1000
          } seconds, its catalog is deregistered.`
        );
        await this.catalogService.removeDataset(dataPlane.dataset.id);
        dataPlane.dataset = undefined;
      }
    }
  }

  async requestTransfer(
    requestDetail: TransferRequestMessage,
    processId: string,
    role: "provider" | "consumer"
  ): Promise<DataPlaneTransferDto> {
    const dataPlanes = await this.dataPlaneRepository.findBy({
      dataplaneType: requestDetail.format,
      role: In([role, "both"]),
    });
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
            Authorization: `Bearer ${dataPlane.managementToken}`,
          },
        };
        const dataPlaneRequestResponse =
          await this.axios.post<DataPlaneRequestResponseDto>(
            `${dataPlane.managementAddress}/transfers/request/${role}?processId=${processId}`,
            await requestDetail.serialize(),
            requestConfig
          );
        if (dataPlaneRequestResponse.data.accepted) {
          this.logger.debug(
            `Dataplane ${dataPlane.identifier} accepted transfer`
          );
          return {
            dataPlaneIdentifier: dataPlane.identifier,
            endpointType: dataPlane.dataplaneType,
            ...dataPlaneRequestResponse.data,
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
      dataPlaneTransfer.dataPlaneIdentifier
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`,
        },
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.identifier}/start`,
        transferStartMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.identifier} started`);
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
      dataPlaneTransfer.dataPlaneIdentifier
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`,
        },
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.identifier}/complete`,
        transferCompletionMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.identifier} completed`);
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
      dataPlaneTransfer.dataPlaneIdentifier
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`,
        },
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.identifier}/terminate`,
        transferTerminationMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.identifier} terminated`);
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
      dataPlaneTransfer.dataPlaneIdentifier
    );
    if (dataPlane === undefined) {
      throw new DSPError(
        `Data plane with identifier ${dataPlaneTransfer.dataPlaneIdentifier} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    try {
      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${dataPlane.managementToken}`,
        },
      };
      await this.axios.post(
        `${dataPlane.managementAddress}/transfers/${dataPlaneTransfer.identifier}/suspend`,
        transferSuspensionMessage,
        requestConfig
      );
      this.logger.debug(`Transfer ${dataPlaneTransfer.identifier} suspended`);
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
        catalogSynchronization: "pull",
      },
    });
    const dataPlanePromises = dataPlanes.map((dataPlane) =>
      this.pullCatalog(dataPlane)
    );
    await Promise.all(dataPlanePromises);
  }

  @Interval("healthCheck", DataPlaneService.pullInterval)
  async healthChecks() {
    const dataPlanes = await this.dataPlaneRepository.find({
      where: {
        catalogSynchronization: "push",
      },
    });
    const dataPlanePromises = dataPlanes.map((dataPlane) =>
      this.healthCheck(dataPlane)
    );
    await Promise.all(dataPlanePromises);
  }
}
