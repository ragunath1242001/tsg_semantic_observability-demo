import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { promiseMap } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  createInitPromise,
  DataPlaneRegistrationService,
  DataPlaneStateDao,
  InitPromise
} from "@tsg-dsp/common-data-plane-api";
import {
  DataPlaneCreation,
  DatasetDto,
  defaultContext,
  DistributionDto,
  OfferDto,
  PermissionDto
} from "@tsg-dsp/common-dsp";
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import crypto from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { DatasetDao } from "./dataset.dao.js";

@Injectable()
export class DataPlaneService implements OnModuleInit {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(DatasetDao)
    private readonly datasetRepository: Repository<DatasetDao>,
    private readonly registration: DataPlaneRegistrationService,
    private readonly catalog: CatalogClientService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  initialized: InitPromise = createInitPromise();
  private defaultDataset: DatasetDto[] = this.createDataset();

  private createDataset(): DatasetDto[] {
    const orchestrationDatasetId = `urn:uuid:${crypto.randomUUID()}`;
    const projectAgreementsDatasetId = `urn:uuid:${crypto.randomUUID()}`;
    return [
      {
        "@context": defaultContext(),
        "@id": orchestrationDatasetId,
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
            "@id": `${orchestrationDatasetId}:policy`,
            permission: [
              {
                "@type": "Permission",
                action: "use",
                target: orchestrationDatasetId
              } as PermissionDto
            ]
          } as OfferDto
        ],
        distribution: [
          {
            "@type": "Distribution",
            "@id": `${orchestrationDatasetId}:application/analytics-data-plane`,
            title: "Analytics Data Plane (tsg:analytics)",
            format: "tsg:analytics"
          } as DistributionDto
        ]
      } as DatasetDto,
      {
        "@context": defaultContext(),
        "@id": projectAgreementsDatasetId,
        "@type": "Dataset",
        title: "Analytics Data Plane Project Agreements",
        description: [
          "Project agreement service for the orchestration of project agreements in the Analytics Data Plane"
        ],
        conformsTo: ["tsg:project-agreement"],
        keyword: ["analytics", "project-agreement"],
        theme: ["analytics", "project-agreement"],
        language: "en",
        hasPolicy: [
          {
            "@type": "Offer",
            "@id": `${projectAgreementsDatasetId}:policy`,
            permission: [
              {
                "@type": "Permission",
                action: "use",
                target: projectAgreementsDatasetId
              } as PermissionDto
            ]
          } as OfferDto
        ],
        distribution: [
          {
            "@type": "Distribution",
            "@id": `${projectAgreementsDatasetId}:application/analytics-data-plane`,
            title: "Analytics Data Plane (tsg:analytics)",
            format: "tsg:analytics"
          } as DistributionDto
        ]
      } as DatasetDto
    ];
  }

  async onModuleInit() {
    const isRegistered = await this.registration.isRegistered();
    if (isRegistered) {
      this.logger.log("Data plane is already registered");
      this.initialized.resolve();
    } else {
      this.logger.log(
        `Creating new state (after ${this.config.controlPlane.initializationDelay}ms)`
      );
      setTimeout(async () => {
        try {
          await this.registerDataplane();
          this.initialized.resolve();
        } catch (error) {
          this.logger.error("Error registering dataplane", error);
          this.initialized.reject(error);
        }
      }, this.config.controlPlane.initializationDelay);
    }
  }

  async registerDataplane() {
    this.logger.log("Registering data plane with control plane");
    const dataPlaneCreation: DataPlaneCreation = {
      title: this.config.controlPlane.dataPlaneTitle,
      dataplaneType: "tsg:analytics",
      endpointPrefix: `${this.config.server.publicAddress}/data`,
      callbackAddress: this.config.server.publicAddress,
      managementAddress: this.config.server.publicAddress,
      catalogSynchronization: "push",
      role: "both"
    };
    const details = await this.registration.register(dataPlaneCreation);
    if (await this.hasStoredDatasets()) {
      this.logger.log("Using stored datasets");
      const datasets = await this.getDatasets();
      await promiseMap(datasets, async (datasetDto) => {
        await this.catalog.syncDataset(details.identifier, datasetDto);
      });
    } else {
      this.logger.log("Creating new datasets");
      const datasetDtos = this.config.dataset ?? this.defaultDataset;
      await promiseMap(datasetDtos, this.addDataset.bind(this));
    }
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
    const currentState = await this.getState();
    await this.datasetRepository.save({
      identifier: dataset["@id"],
      dataset
    });
    await this.catalog.syncDataset(currentState.details.identifier, dataset);
  }

  async updateDataset(datasetId: string, updatedDataset: DatasetDto) {
    const currentState = await this.getState();

    // Check if the dataset exists and fail early if not
    await this.getDataset(datasetId);
    await this.catalog.updateDataset(
      currentState.details.identifier,
      datasetId,
      updatedDataset
    );
    await this.datasetRepository.save({
      identifier: datasetId,
      dataset: updatedDataset
    });
  }

  async deleteDataset(datasetId: string) {
    const currentState = await this.getState();
    await this.getDataset(datasetId);
    await this.datasetRepository.delete({ identifier: datasetId });
    await this.catalog.deleteDataset(
      currentState.details.identifier,
      datasetId
    );
  }

  async getState(): Promise<DataPlaneStateDao> {
    return this.registration.getState();
  }

  async getStateDto(): Promise<DataPlaneStateDto> {
    return this.registration.getState();
  }
}
