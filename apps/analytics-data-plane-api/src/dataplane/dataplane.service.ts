import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AuthClientService,
  parseNetworkError,
  promiseMap
} from "@tsg-dsp/common-api";
import {
  CatalogDto,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  DatasetDto,
  defaultContext,
  DistributionDto,
  OfferDto,
  PermissionDto
} from "@tsg-dsp/common-dsp";
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import { AxiosInstance } from "axios";
import crypto from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { DataPlaneClientError, DataPlaneError } from "../utils/errors/error.js";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { DatasetDao } from "./dataset.dao.js";
import { ManagementClient } from "./management-client.service.js";

@Injectable()
export class DataPlaneService {
  private readonly axiosDataPlane: AxiosInstance;
  private readonly axiosControlPlane: AxiosInstance;

  constructor(
    private readonly config: RootConfig,
    authClient: AuthClientService,
    @InjectRepository(DataPlaneStateDao)
    private readonly stateRepository: Repository<DataPlaneStateDao>,
    @InjectRepository(DatasetDao)
    private readonly datasetRepository: Repository<DatasetDao>,
    private readonly managementClient: ManagementClient
  ) {
    this.initialized = this.init();
    this.axiosDataPlane = authClient.axiosInstance({
      baseURL: this.config.controlPlane.dataPlaneEndpoint
    });
    this.axiosControlPlane = authClient.axiosInstance({
      baseURL: this.config.controlPlane.controlEndpoint
    });
  }
  private readonly logger = new Logger(this.constructor.name);
  initialized: Promise<void>;
  private state?: DataPlaneStateDao;
  private defaultDataset: DatasetDto[] = this.createDataset();

  private createDataset(): DatasetDto[] {
    const datasetId = `urn:uuid:${crypto.randomUUID()}`;
    return [
      {
        "@context": defaultContext(),
        "@id": datasetId,
        "@type": "Dataset",
        title: "Analytics Data Plane Orchestration",
        description: [
          "Dataset service for the orchestration aspects of the Analytics Data Plane"
        ],
        conformsTo: ["tsg:analytics-orchestration"],
        keyword: ["analytics"],
        theme: ["analytics"],
        language: "en",
        hasPolicy: [
          {
            "@type": "Offer",
            "@id": `${datasetId}:policy`,
            permission: [
              {
                "@type": "Permission",
                action: "use",
                target: datasetId
              } as PermissionDto
            ]
          } as OfferDto
        ],
        distribution: [
          {
            "@type": "Distribution",
            "@id": `${datasetId}:application/analytics-data-plane`,
            title: "Analytics Data Plane (tsg:analytics)",
            format: "tsg:analytics"
          } as DistributionDto
        ]
      } as DatasetDto
    ];
  }

  async init() {
    const state = await this.stateRepository.findOneBy([]);
    if (state) {
      this.logger.log("Loading state from database");
      this.state = state;
    } else {
      this.logger.log(
        `Creating new state (after ${this.config.controlPlane.initializationDelay}ms)`
      );
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await this.registerDataplane();
          resolve();
        }, this.config.controlPlane.initializationDelay);
      });
    }
  }

  async registerDataplane() {
    this.logger.log("Registering data plane with control plane");
    const dataPlaneCreation: DataPlaneCreation = {
      identifier: this.state?.identifier,
      title: this.config.controlPlane.title,
      dataplaneType: "tsg:analytics",
      endpointPrefix: `${this.config.server.publicAddress}/data`,
      callbackAddress: this.config.server.publicAddress,
      managementAddress: this.config.server.publicAddress,
      managementToken: "",
      catalogSynchronization: "push",
      role: "both"
    };
    const details = await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/init`,
      dataPlaneCreation
    );
    const state = await this.stateRepository.save({
      identifier: details.data.identifier,
      details: details.data
    });
    this.state = state;
    if (await this.hasStoredDatasets()) {
      this.logger.log("Using stored datasets");
      const datasets = await this.getDatasets();
      await promiseMap(datasets, async (datasetDto) => {
        await this.axiosDataPlane.post(
          `/${details.data.identifier}/dataset`,
          datasetDto
        );
      });
    } else {
      this.logger.log("Creating new datasets");
      const datasetDtos = this.config.dataset ?? this.defaultDataset;
      await promiseMap(datasetDtos, this.addDataset.bind(this));
    }
    return state;
  }

  async getControlPlaneCatalog(): Promise<CatalogDto> {
    return this.managementClient.getOwnCatalog();
  }

  async getRegistryAddresses(): Promise<{ didId: string; address: string }[]> {
    try {
      const response = await this.axiosControlPlane.get<
        { didId: string; address: string }[]
      >("/registry/addresses");
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        "Fetching registry addresses from control plane failed",
        err
      ).andLog(this.logger);
    }
  }

  async getParticipantId() {
    return this.managementClient.getOwnParticipantId();
  }

  async hasStoredDatasets(): Promise<boolean> {
    const count = await this.datasetRepository.count();
    return count > 0;
  }

  async getDatasets(): Promise<DatasetDto[]> {
    const datasets = await this.datasetRepository.find();
    return datasets.map((datasetDao) => datasetDao.dataset);
  }

  async getDataset(datasetId: string): Promise<DatasetDto> {
    const dataset = await this.datasetRepository.findOneBy({
      identifier: datasetId
    });
    if (!dataset) {
      throw new DataPlaneError(
        `Dataset with id ${datasetId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return dataset.dataset;
  }

  async addDataset(dataset: DatasetDto) {
    const currentState = this.getState();
    try {
      await this.axiosDataPlane.post(
        `/${currentState.identifier}/dataset`,
        dataset
      );

      await this.datasetRepository.save({
        identifier: dataset["@id"],
        dataset
      });
    } catch (error) {
      throw parseNetworkError(error, "adding dataset to control plane");
    }
  }

  async updateDataset(datasetId: string, updatedDataset: DatasetDto) {
    const currentState = this.getState();

    // Check if the dataset exists and fail early if not
    await this.getDataset(datasetId);

    try {
      await this.axiosDataPlane.put(
        `/${currentState.identifier}/dataset/${datasetId}`,
        updatedDataset
      );
      await this.datasetRepository.update(
        { identifier: datasetId },
        { dataset: updatedDataset }
      );
    } catch (error) {
      throw parseNetworkError(error, "updating dataset in control plane");
    }
  }

  async deleteDataset(datasetId: string) {
    const currentState = this.getState();
    await this.getDataset(datasetId);
    try {
      await this.axiosDataPlane.delete(
        `/${currentState.identifier}/dataset/${datasetId}`
      );
      await this.datasetRepository.delete({ identifier: datasetId });
    } catch (error) {
      throw parseNetworkError(error, "deleting dataset in control plane");
    }
  }

  private getState(): DataPlaneStateDao {
    if (!this.state) {
      throw new DataPlaneError(
        "No state available yet",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    return this.state;
  }

  async getStateDto(): Promise<DataPlaneStateDto> {
    return this.getState();
  }
}
