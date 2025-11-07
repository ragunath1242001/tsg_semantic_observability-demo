import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  UnprocessableEntityException
} from "@nestjs/common";
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
  CatalogDto,
  Constraint,
  DataPlaneCreation,
  Dataset,
  DatasetDto,
  defaultContext,
  deserialize,
  Distribution,
  ODRLLeftOperand,
  ODRLOperator,
  Offer,
  Permission,
  Policy,
  Prohibition
} from "@tsg-dsp/common-dsp";
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import {
  CollectionDatasetConfig,
  DatasetConfig,
  DatasetItem,
  DatasetItemWithDto,
  PolicyConfig,
  RuleConstraintConfig,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";
import crypto from "crypto";
import { IsNull, Not, Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { defArray } from "../utils/arrays.js";
import { DataPlaneError } from "../utils/errors/error.js";
import {
  DatasetItemDao,
  HttpDatasetConfigDao,
  VersionedDatasetDao
} from "./dataplane.dao.js";

@Injectable()
export class DataPlaneService implements OnModuleInit {
  constructor(
    private readonly config: RootConfig,
    private readonly registration: DataPlaneRegistrationService,
    private readonly catalog: CatalogClientService,
    @InjectRepository(HttpDatasetConfigDao)
    private readonly configRepository: Repository<HttpDatasetConfigDao>,
    @InjectRepository(DatasetItemDao)
    private readonly itemRepository: Repository<DatasetItemDao>,
    @InjectRepository(VersionedDatasetDao)
    private readonly versionedItemRepository: Repository<VersionedDatasetDao>
  ) {}
  logger = new Logger(this.constructor.name);
  initialized: InitPromise = createInitPromise();
  private activeConfig?: HttpDatasetConfigDao;

  async onModuleInit() {
    const activeConfig = await this.configRepository.findOneBy([]);
    if (
      this.config.dataset?.type === "collection" &&
      this.config.initCollection?.length
    ) {
      if ((await this.itemRepository.count()) === 0) {
        await this.itemRepository.save(
          this.config.initCollection.map((item) => {
            return {
              ...item,
              id: item.id ?? `urn:uuid:${crypto.randomUUID()}`
            };
          })
        );
      }
    }

    if (activeConfig) {
      this.logger.log("Loading state from database");
      this.activeConfig = activeConfig;
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
    const dataPlaneCreation: DataPlaneCreation = {
      title: this.config.controlPlane.dataPlaneTitle,
      dataplaneType: "tsg:HTTP",
      endpointPrefix: `${this.config.server.publicAddress}/data`,
      callbackAddress: this.config.server.publicAddress,
      managementAddress: this.config.server.publicAddress,
      catalogSynchronization: "push",
      role: this.config.dataset ? "both" : "consumer"
    };

    const details = await this.registration.register(dataPlaneCreation);
    if (this.config.dataset) {
      const datasets = await this.createDatasets(
        this.activeConfig?.datasetConfig || this.config.dataset
      );
      const catalogDto: CatalogDto = {
        "@context": defaultContext(),
        "@type": "Catalog",
        "@id": details.identifier,
        participantId: "",
        dataset: datasets
      };
      await this.catalog.syncCatalog(details.identifier, catalogDto);
    }
    this.activeConfig = await this.configRepository.save({
      identifier: details.identifier,
      datasetConfig: this.activeConfig?.datasetConfig || this.config.dataset
    });
  }

  async getState(): Promise<DataPlaneStateDao> {
    return this.registration.getState();
  }

  async getStateDto(): Promise<DataPlaneStateDto> {
    return this.registration.getState();
  }

  getDatasetConfig(): DatasetConfig {
    const datasetConfig = this.activeConfig?.datasetConfig;
    if (datasetConfig) {
      return datasetConfig;
    } else {
      throw new DataPlaneError("No dataset configured", HttpStatus.NOT_FOUND);
    }
  }

  async getDatasets(): Promise<DatasetDto[]> {
    if (!this.activeConfig) {
      throw new DataPlaneError(
        "No active config available yet",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    if (this.activeConfig.datasetConfig instanceof VersionedDatasetConfig) {
      const items = await this.versionedItemRepository.find();
      return items.map((item) => item.dataset);
    } else if (
      this.activeConfig.datasetConfig instanceof CollectionDatasetConfig
    ) {
      const items = await this.itemRepository.find({
        where: {
          dataset: Not(IsNull())
        },
        select: ["dataset"]
      });
      return items.map((item) => item.dataset).filter((d) => d !== null);
    }
    return [];
  }

  async getDatasetItems(): Promise<DatasetItemWithDto[]> {
    if (!this.activeConfig) {
      throw new DataPlaneError(
        "No active config available yet",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    if (this.activeConfig.datasetConfig instanceof VersionedDatasetConfig) {
      throw new DataPlaneError(
        "Can't get dataset items from versioned dataset configuration",
        HttpStatus.BAD_REQUEST
      );
    } else if (
      this.activeConfig.datasetConfig instanceof CollectionDatasetConfig
    ) {
      return await this.itemRepository.find();
    }
    return [];
  }

  async getDataset(
    id: string,
    currentVersion: boolean = true
  ): Promise<DatasetDto> {
    if (!this.activeConfig) {
      throw new DataPlaneError(
        "No active config available yet",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    if (this.activeConfig.datasetConfig instanceof VersionedDatasetConfig) {
      const versionedDataset = await this.getVersionedDataset(id);
      if (
        currentVersion &&
        !versionedDataset.dataset.version &&
        versionedDataset.dataset.hasCurrentVersion
      ) {
        const currentVersionedDataset = await this.getVersionedDataset(
          versionedDataset.dataset.hasCurrentVersion
        );
        return currentVersionedDataset.dataset;
      }
      return versionedDataset.dataset;
    } else {
      const item = await this.getDatasetItem(id);
      if (!item?.dataset) {
        throw new HttpException(
          `Dataset ${id} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      return item.dataset;
    }
  }

  async getVersionedDataset(id: string): Promise<VersionedDatasetDao> {
    const item = await this.versionedItemRepository.findOneBy({
      identifier: id
    });
    if (!item) {
      throw new HttpException(
        `Versioned dataset ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return item;
  }

  async getDatasetItem(datasetId: string): Promise<DatasetItemDao> {
    const item = await this.itemRepository.findOneBy({ id: datasetId });
    if (!item) {
      throw new HttpException(
        `Dataset ${datasetId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return item;
  }

  async updateDatasetConfig(datasetConfig: DatasetConfig) {
    if (
      datasetConfig instanceof VersionedDatasetConfig &&
      !datasetConfig.versions.some(
        (v) => v.version === datasetConfig.currentVersion
      )
    ) {
      throw new UnprocessableEntityException(
        "Can't find given current version in given list of dataset versions"
      );
    }
    const currentState = await this.registration.getState();

    if (currentState.details.role === "consumer") {
      currentState.details.role = "both";
      await this.registration.register(currentState.details);
    }

    const datasets = await this.createDatasets(datasetConfig);
    const catalogDto: CatalogDto = {
      "@context": defaultContext(),
      "@type": "Catalog",
      "@id": currentState.details.identifier,
      participantId: "",
      dataset: datasets
    };
    await this.catalog.syncCatalog(currentState.details.identifier, catalogDto);
    this.activeConfig = await this.configRepository.save({
      ...currentState,
      datasetConfig: datasetConfig
    });
  }

  async getBackendConfig(dataset: DatasetDto) {
    if (!this.activeConfig) {
      throw new DataPlaneError(
        "No state available yet",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    if (this.activeConfig.datasetConfig instanceof VersionedDatasetConfig) {
      const version = this.activeConfig.datasetConfig.versions.find(
        (v) => v.version === dataset.version
      );
      if (!version) {
        throw new HttpException(
          `Version ${dataset.version} not found in dataset configuration`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      return {
        backendUrl: version.distributions[0].backendUrl,
        authorization: version.authorization
      };
    } else {
      const item = await this.getDatasetItem(dataset["@id"]);
      return {
        backendUrl: item.backendUrl,
        authorization: item.authorization
      };
    }
  }

  async addDatasetItem(item: DatasetItem) {
    const state = await this.getState();
    const datasetConfig = this.getDatasetConfig();
    if (datasetConfig instanceof CollectionDatasetConfig) {
      const itemDao = this.itemRepository.create({
        ...item,
        id: item.id ?? `urn:uuid:${crypto.randomUUID()}`
      });
      const dataset = await this.createCollectionDataset(
        itemDao,
        datasetConfig
      );
      await this.catalog.syncDataset(state.details.identifier, dataset);
      return itemDao;
    }
    throw new DataPlaneError(
      "Can't add dataset item to non-collection dataset",
      HttpStatus.BAD_REQUEST
    );
  }

  async updateDatasetItem(id: string, item: DatasetItem) {
    const state = await this.getState();
    const datasetConfig = this.getDatasetConfig();
    if (datasetConfig instanceof CollectionDatasetConfig) {
      const itemDao = await this.getDatasetItem(id);
      itemDao.title = item.title;
      itemDao.version = item.version;
      itemDao.backendUrl = item.backendUrl;
      itemDao.authorization = item.authorization;
      itemDao.mediaType = item.mediaType;
      itemDao.schemaRef = item.schemaRef;
      itemDao.openApiSpecRef = item.openApiSpecRef;
      itemDao.policy = item.policy;

      const dataset = await this.createCollectionDataset(
        itemDao,
        datasetConfig
      );
      await this.catalog.updateDataset(state.details.identifier, id, dataset);
      return itemDao;
    }
    throw new DataPlaneError(
      "Can't update dataset item in non-collection dataset",
      HttpStatus.BAD_REQUEST
    );
  }

  async removeDatasetItem(id: string) {
    const state = await this.getState();
    const datasetConfig = this.getDatasetConfig();
    if (datasetConfig instanceof CollectionDatasetConfig) {
      const itemDao = await this.getDatasetItem(id);
      await this.catalog.deleteDataset(state.details.identifier, id);
      await this.itemRepository.remove(itemDao);
      return itemDao;
    }
    throw new DataPlaneError(
      "Can't remove dataset item from non-collection dataset",
      HttpStatus.BAD_REQUEST
    );
  }

  private async createDatasets(
    datasetConfig: DatasetConfig
  ): Promise<DatasetDto[]> {
    if (datasetConfig instanceof VersionedDatasetConfig) {
      return this.createVersionedDatasets(datasetConfig);
    } else if (datasetConfig instanceof CollectionDatasetConfig) {
      return this.createCollectionDatasets(datasetConfig);
    }
    throw new DataPlaneError("Invalid dataset config", HttpStatus.BAD_REQUEST);
  }

  private async createCollectionDatasets(
    datasetConfig: CollectionDatasetConfig
  ): Promise<DatasetDto[]> {
    const items = await this.itemRepository.find();
    return await promiseMap(items, async (item) => {
      return this.createCollectionDataset(item, datasetConfig);
    });
  }

  private async createCollectionDataset(
    item: DatasetItemDao,
    datasetConfig: CollectionDatasetConfig
  ): Promise<DatasetDto> {
    let policyConfigs: PolicyConfig[] = [];
    if (item.policy) {
      policyConfigs = item.policy;
    } else if (datasetConfig.basePolicy) {
      policyConfigs = [datasetConfig.basePolicy];
    }
    let policies: Policy[] | undefined = undefined;
    if (policyConfigs.length > 0) {
      const intermediatePolicies = await Promise.all(
        policyConfigs.map((policyConfig) =>
          this.constructOffer(item.id, policyConfig)
        )
      );
      policies = intermediatePolicies.filter((p) => p !== undefined).flat();
    }

    const dataset = new Dataset({
      id: item.id,
      title: item.title,
      version: item.version,
      landingPage: datasetConfig.landingPage,
      conformsTo: defArray(datasetConfig.baseSemanticModelRef),
      distribution: [
        new Distribution({
          id: `${item.id}:${item.version}:${item.mediaType ?? datasetConfig.mediaType ?? "application/http"}`,
          title: `${item.title} ${item.version} (${
            item.mediaType ?? datasetConfig.mediaType ?? "application/http"
          })`,
          format: "tsg:HTTP",
          mediaType: `iana:${item.mediaType ?? datasetConfig.mediaType ?? "application/http"}`,
          conformsTo: defArray(
            item.schemaRef ?? datasetConfig.schemaRef,
            item.openApiSpecRef ?? datasetConfig.openApiSpecRef
          )
        })
      ],
      hasPolicy: policies
    });
    item.dataset = dataset.serialize();
    await this.itemRepository.save(item);
    return item.dataset;
  }

  private async createVersionedDatasets(
    datasetConfig: VersionedDatasetConfig
  ): Promise<DatasetDto[]> {
    const id = datasetConfig.id || `urn:uuid:${crypto.randomUUID()}`;

    const currentDatasetRef =
      datasetConfig.versions.filter(
        (v) => v.version === datasetConfig.currentVersion
      )[0]?.version ?? datasetConfig.versions[0].version;

    const baseDataset = new Dataset({
      id: id,
      title: datasetConfig.title,
      landingPage: datasetConfig.landingPage,
      conformsTo: defArray(datasetConfig.baseSemanticModelRef),
      hasVersion: datasetConfig.versions.map((v) => `${id}:${v.version}`),
      hasCurrentVersion: `${id}:${currentDatasetRef}`,
      hasPolicy: await this.constructOffer(id, datasetConfig.policy)
    });
    const versions = datasetConfig.versions.map((v, idx) => {
      return {
        ...v,
        previous: datasetConfig.versions.at(idx + 1)
      };
    });
    const datasets = [baseDataset.serialize()];
    for (const v of versions) {
      datasets.push(
        new Dataset({
          id: `${id}:${v.version}`,
          title: `${datasetConfig.title} (${v.version})`,
          version: `${v.version}`,
          landingPage: datasetConfig.landingPage,
          isVersionOf: id,
          previousVersion: v.previous
            ? `${id}:${v.previous.version}`
            : undefined,
          conformsTo: defArray(
            v.semanticModelRef ?? datasetConfig.baseSemanticModelRef
          ),
          distribution: v.distributions.map(
            (d) =>
              new Distribution({
                id: `${id}:${v.version}:${d.mediaType ?? "application/http"}`,
                title: `${datasetConfig.title} ${v.version} (${
                  d.mediaType ?? "application/http"
                })`,
                format: "tsg:HTTP",
                mediaType: `iana:${d.mediaType ?? "application/http"}`,
                conformsTo: defArray(d.schemaRef, d.openApiSpecRef)
              })
          ),
          hasPolicy: await this.constructOffer(
            `${id}:${v.version}`,
            datasetConfig.policy
          )
        }).serialize()
      );
    }
    await this.versionedItemRepository.save(
      datasets.map((dataset) => ({
        identifier: dataset["@id"],
        dataset: dataset
      }))
    );
    return datasets;
  }

  private async constructOffer(
    datasetId: string,
    policyConfig?: PolicyConfig
  ): Promise<Policy[] | undefined> {
    if (!policyConfig) return;
    if (policyConfig.type === "default") return;

    const participantId = await this.catalog.getOptionalParticipantId();

    if (policyConfig.type === "manual") {
      if (!policyConfig.raw) {
        throw new DataPlaneError(
          `Property "raw" must be provided for policy configs with type "manual"`,
          HttpStatus.BAD_REQUEST
        );
      } else {
        try {
          const deserialized = await deserialize<Offer>(policyConfig.raw);
          if (!deserialized.target) {
            deserialized.target = datasetId;
          }
          if (!deserialized.assigner) {
            deserialized.assigner = participantId || "";
          }
          return [deserialized];
        } catch (err) {
          throw new DataPlaneError(
            `Could not deserialize "raw" into a ODRL Policy`,
            HttpStatus.BAD_REQUEST,
            err
          );
        }
      }
    }

    return [
      new Offer({
        assigner: participantId || "",
        target: datasetId,
        permission: policyConfig.permissions?.map((permission) => {
          return new Permission({
            action: permission.action,
            constraint: permission.constraints?.map((constraint) =>
              this.constructConstraint(constraint)
            )
          });
        }),
        prohibition: policyConfig.prohibitions?.map((prohibition) => {
          return new Prohibition({
            action: prohibition.action,
            constraint: prohibition.constraints?.map((constraint) =>
              this.constructConstraint(constraint)
            )
          });
        })
      })
    ];
  }

  private constructConstraint(constraint: RuleConstraintConfig): Constraint {
    switch (constraint.type) {
      case "CredentialType":
        return new Constraint({
          leftOperand: "dspace:credentialType",
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value
        });
      case "Recipient":
        return new Constraint({
          leftOperand: ODRLLeftOperand.RECIPIENT,
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value
        });
      case "License":
        return new Constraint({
          leftOperand: "dspace:license",
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value
        });
      default:
        return new Constraint({
          leftOperand: constraint.type,
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value
        });
    }
  }
}
