import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  UnprocessableEntityException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { parseNetworkError, promiseMap } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  createInitPromise,
  DataPlaneError,
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
  Prohibition,
  validateExtraProps
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
import axios from "axios";
import crypto from "crypto";
import { Response } from "express";
import { IsNull, Not, Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { DatasetConfigObserverService } from "../semantic-observability/dataset-config-observer.service.js";
import { defArray } from "../utils/arrays.js";
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
    private readonly datasetConfigObserver: DatasetConfigObserverService,
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
    const publicApiAddress = apiAddress(this.config.server.publicAddress);
    const dataPlaneCreation: DataPlaneCreation = {
      title: this.config.controlPlane.dataPlaneTitle,
      dataplaneType: "tsg:HTTP",
      endpointPrefix: `${publicApiAddress}/data`,
      callbackAddress: publicApiAddress,
      managementAddress: `${publicApiAddress}/management`,
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
        "@id": details.id,
        participantId: "",
        dataset: datasets
      };
      await this.catalog.syncCatalog(details.id, catalogDto);
    }
    this.activeConfig = await this.configRepository.save(
      this.configRepository.create({
        id: details.id,
        datasetConfig: this.activeConfig?.datasetConfig || this.config.dataset
      })
    );
    if (this.activeConfig.datasetConfig) {
      await this.datasetConfigObserver.recordDatasetConfigObserved(
        this.activeConfig.datasetConfig
      );
    }
  }

  async fetchOpenApiDocument(url: string, response: Response): Promise<void> {
    try {
      const axiosResponse = await axios.get(url, {
        responseType: "stream"
      });
      response.setHeader(
        "content-type",
        axiosResponse.headers["content-type"] || "application/json"
      );
      axiosResponse.data.pipe(response);
    } catch (error) {
      throw parseNetworkError(error, "fetching OpenAPI document");
    }
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
      id: id
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
      "@id": currentState.details.id,
      participantId: "",
      dataset: datasets
    };
    await this.catalog.syncCatalog(currentState.details.id, catalogDto);
    this.activeConfig = await this.configRepository.save(
      this.configRepository.create({
        ...currentState,
        datasetConfig: datasetConfig
      })
    );
    await this.datasetConfigObserver.recordDatasetConfigObserved(datasetConfig);
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
      await this.catalog.syncDataset(state.details.id, dataset);
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
      itemDao.extraProps = item.extraProps;

      const dataset = await this.createCollectionDataset(
        itemDao,
        datasetConfig
      );
      await this.catalog.updateDataset(state.details.id, id, dataset);
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
      await this.catalog.deleteDataset(state.details.id, id);
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

    const extraProps = {
      ...datasetConfig.extraProps,
      ...item.extraProps
    };

    const hasExtraProps = Object.keys(extraProps).length > 0;
    if (hasExtraProps) {
      await this.validateExtraProps(
        extraProps,
        datasetConfig.validateExtraProps
      );
    }

    const dataset = new Dataset({
      id: item.id,
      title: item.title,
      description: item.description,
      version: item.version,
      landingPage: datasetConfig.landingPage,
      conformsTo: defArray(datasetConfig.baseSemanticModelRef),
      extraProps: hasExtraProps ? extraProps : undefined,
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
    await this.datasetConfigObserver.recordDatasetItemObserved(
      item,
      datasetConfig
    );
    return item.dataset;
  }

  private async validateExtraProps(
    extraProps: Record<string, unknown>,
    validationLevel: "error" | "warn" | "ignore"
  ) {
    if (validationLevel === "ignore") return;
    try {
      await validateExtraProps(extraProps, {
        compaction: true
      });
      await this.datasetConfigObserver.recordMetadataValidationResult(
        validationLevel
      );
    } catch (error) {
      await this.datasetConfigObserver.recordMetadataValidationResult(
        validationLevel,
        error as Error
      );
      if (validationLevel === "error") {
        throw new DataPlaneError(
          `Dataset has extraProps with unknown prefixes: ${
            (error as Error).message
          }. Please ensure all extraProps keys have a known prefix.`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      } else {
        this.logger.warn(
          `Dataset has extraProps with unknown prefixes, but validation is disabled. Please ensure all extraProps keys have a known prefix. Validation error: ${
            (error as Error).message
          }`
        );
      }
    }
  }

  private async createVersionedDatasets(
    datasetConfig: VersionedDatasetConfig
  ): Promise<DatasetDto[]> {
    const id = datasetConfig.id || `urn:uuid:${crypto.randomUUID()}`;

    const currentDatasetRef =
      datasetConfig.versions.filter(
        (v) => v.version === datasetConfig.currentVersion
      )[0]?.version ?? datasetConfig.versions[0].version;

    if (datasetConfig.extraProps) {
      await this.validateExtraProps(
        datasetConfig.extraProps,
        datasetConfig.validateExtraProps
      );
    }
    for (const v of datasetConfig.versions) {
      if (v.extraProps) {
        await this.validateExtraProps(
          v.extraProps,
          datasetConfig.validateExtraProps
        );
      }
    }

    const baseDataset = new Dataset({
      id: id,
      title: datasetConfig.title,
      description: datasetConfig.description,
      landingPage: datasetConfig.landingPage,
      conformsTo: defArray(datasetConfig.baseSemanticModelRef),
      extraProps: datasetConfig.extraProps,
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
      const versionExtraProps = {
        ...datasetConfig.extraProps,
        ...v.extraProps
      };
      const hasVersionExtraProps = Object.keys(versionExtraProps).length > 0;
      datasets.push(
        new Dataset({
          id: `${id}:${v.version}`,
          title: `${datasetConfig.title} (${v.version})`,
          description: datasetConfig.description,
          version: `${v.version}`,
          landingPage: datasetConfig.landingPage,
          isVersionOf: id,
          previousVersion: v.previous
            ? `${id}:${v.previous.version}`
            : undefined,
          conformsTo: defArray(
            v.semanticModelRef ?? datasetConfig.baseSemanticModelRef
          ),
          extraProps: hasVersionExtraProps ? versionExtraProps : undefined,
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
      datasets.map((dataset) =>
        this.versionedItemRepository.create({
          id: dataset["@id"],
          dataset: dataset
        })
      )
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

function apiAddress(publicAddress: string): string {
  const normalizedPublicAddress = publicAddress.replace(/\/$/, "");
  const apiPrefix = `${process.env["SUBPATH"] ?? ""}/api`;
  if (normalizedPublicAddress.endsWith(apiPrefix)) {
    return normalizedPublicAddress;
  }
  return `${normalizedPublicAddress}${apiPrefix}`;
}
