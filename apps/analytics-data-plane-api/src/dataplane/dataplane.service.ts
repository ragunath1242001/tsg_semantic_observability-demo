import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuthClientService, promiseMap } from "@tsg-dsp/common-api";
import {
  Catalog,
  CatalogDto,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  Dataset,
  DatasetDto,
  defaultContext,
  deserialize,
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
    const dataPlaneCreation: DataPlaneCreation = {
      identifier: this.state?.identifier,
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
    const datasets: Dataset[] = await promiseMap(
      this.state?.dataset ?? this.config.dataset ?? this.defaultDataset,
      async (datasetDto) => deserialize<Dataset>(datasetDto)
    );
    const catalog: Catalog = new Catalog({
      participantId: "",
      dataset: datasets
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${details.data.identifier}/catalog`,
      catalog.serialize()
    );
    const state = await this.stateRepository.save({
      identifier: details.data.identifier,
      details: details.data,
      dataset: this.state?.dataset ?? this.config.dataset ?? this.defaultDataset
    });
    this.state = state;
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

  async addDataset(dataset: DatasetDto) {
    const currentState = this.getState();

    const newDatasets = [...currentState.dataset, dataset];

    const catalog: Catalog = new Catalog({
      participantId: "",
      dataset: await promiseMap(newDatasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: newDatasets
    });

    this.state = state;
    return state;
  }

  async updateDataset(datasetId: string, updatedDataset: DatasetDto) {
    const currentState = this.getState();

    if (!currentState.dataset.find((dataset) => dataset["@id"] === datasetId)) {
      throw new DataPlaneError(
        `Could not find dataset with id ${datasetId}`,
        HttpStatus.NOT_FOUND
      );
    }
    const newDatasets = currentState.dataset.map((dataset) =>
      dataset["@id"] === datasetId ? updatedDataset : dataset
    );

    const catalog: Catalog = new Catalog({
      participantId: "",
      dataset: await promiseMap(newDatasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: newDatasets
    });

    this.state = state;
    return state;
  }

  async deleteDataset(datasetId: string) {
    const currentState = this.getState();
    if (!currentState.dataset.find((dataset) => dataset["@id"] === datasetId)) {
      throw new DataPlaneError(
        `Could not find dataset with id ${datasetId}`,
        HttpStatus.NOT_FOUND
      );
    }
    const newDatasets = currentState.dataset.filter(
      (dataset) => dataset["@id"] !== datasetId
    );

    const catalog: Catalog = new Catalog({
      participantId: "",
      dataset: await promiseMap(newDatasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: newDatasets
    });

    this.state = state;
    return state;
  }

  async updateDatasets(datasets: DatasetDto[]) {
    const currentState = this.getState();

    const catalog: Catalog = new Catalog({
      participantId: "",
      dataset: await promiseMap(datasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: datasets
    });

    this.state = state;
    return state;
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

  async getDatasets(): Promise<DatasetDto[]> {
    const datasetConfig = this.getState().dataset;
    if (datasetConfig) {
      return datasetConfig;
    } else {
      throw new DataPlaneError("No dataset configured", HttpStatus.NOT_FOUND);
    }
  }
}
