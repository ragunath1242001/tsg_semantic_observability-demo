import { HttpStatus, Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AppError,
  ClientInfo,
  getOwnershipFieldsFromClient,
  Paginated,
  PaginationOptionsDto,
  ServerConfig
} from "@tsg-dsp/common-api";
import {
  Catalog,
  CatalogDto,
  CatalogError,
  CatalogErrorDto,
  CatalogRequestMessage,
  Constraint,
  DataService,
  Dataset,
  DatasetDto,
  deserialize,
  ODRLAction,
  ODRLLeftOperand,
  ODRLOperator,
  Offer,
  Permission,
  Prohibition,
  Resource
} from "@tsg-dsp/common-dsp";
import { DeepPartial, Repository } from "typeorm";

import {
  InitCatalog,
  PolicyConfig,
  RuleConstraintConfig
} from "../../config.js";
import {
  CatalogDao,
  DataServiceDao,
  DatasetDao,
  DistributionDao,
  ResourceDao
} from "../../model/catalog.dao.js";
import { DataPlaneDao } from "../../model/dataPlanes.dao.js";
import { DSPError } from "../../utils/errors/error.js";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(CatalogDao)
    private readonly catalogRepository: Repository<CatalogDao>,
    @InjectRepository(DatasetDao)
    private readonly datasetRepository: Repository<DatasetDao>,
    @InjectRepository(DataServiceDao)
    private readonly dataservicesRepository: Repository<DataServiceDao>,
    @InjectRepository(DistributionDao)
    private readonly distributionRepository: Repository<DistributionDao>,
    @InjectRepository(ResourceDao)
    private readonly resourceRepository: Repository<ResourceDao>,
    @Optional() private readonly initCatalog?: InitCatalog,
    @Optional() private readonly server?: ServerConfig,
    @Optional() private readonly defaultPolicy?: PolicyConfig
  ) {
    this.initialized = this.initializeCatalog();
  }
  initialized: Promise<CatalogDao | undefined>;

  private readonly logger = new Logger(this.constructor.name);

  async getCatalogDao(
    paginationOptions?: PaginationOptionsDto
  ): Promise<Paginated<CatalogDao>> {
    const catalogs = await this.catalogRepository.find({
      relations: {
        _services: true,
        _dataset: {
          _resource: true,
          _distribution: {
            _accessService: {
              _resource: true
            }
          }
        }
      }
    });
    const catalog = catalogs[0];

    if (!catalog) {
      throw new DSPError(
        "Catalog not (yet) available",
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }

    if (!paginationOptions) {
      paginationOptions = new PaginationOptionsDto();
    }

    const [datasets, itemCount] = await this.datasetRepository.findAndCount({
      order: {
        [paginationOptions.order_by]: paginationOptions.order
      },
      skip: paginationOptions.skip,
      take: paginationOptions.take,
      relations: {
        _resource: true,
        _distribution: {
          _accessService: {
            _resource: true
          }
        }
      },
      where: {
        _catalog: {
          id: catalog.id
        }
      }
    });

    catalog._datasets = datasets;

    return {
      data: catalog,
      total: itemCount
    };
  }

  async initializeCatalog() {
    const existingCatalog = await this.catalogRepository.find({});
    if (!existingCatalog[0] && this.initCatalog && this.server) {
      const resource = this.resourceRepository.create(
        new Resource({
          creator: this.initCatalog.creator,
          publisher: this.initCatalog.publisher,
          title: this.initCatalog.title,
          description: [this.initCatalog.description]
        })
      );
      const dataset = this.datasetRepository.create({
        ...new Dataset({
          id: resource.id
        }),
        _resource: resource
      });
      const dservice = new DataService({
        endpointDescription: "dspace:connector",
        conformsTo: ["dspace:connector"],
        endpointURL: `${this.server.publicAddress}`
      });
      this.dataservicesRepository.create({
        ...dservice
      });
      const catalog = this.catalogRepository.create(
        new Catalog({
          id: dataset.id,
          participantId: this.initCatalog.participantId
        })
      );
      catalog._services = [this.dataservicesRepository.create(dservice)];
      catalog._dataset = await this.datasetRepository.save(dataset);
      const response = await this.catalogRepository.save(catalog);
      this.initCatalog.datasets?.map(async (dataset) =>
        this.addDataset(await deserialize<Dataset>(JSON.parse(dataset)))
      );
      this.logger.debug(`Initialized catalog`);
      return response;
    }
  }

  async modifyCatalog(catalog: CatalogDao): Promise<void> {
    const { _datasets, _records, _services, ...catalogRemainder } = catalog;
    await this.catalogRepository.update({ id: catalog.id }, catalogRemainder);
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

  async addDataset(
    dataset: Dataset,
    dataPlaneDao: DataPlaneDao | undefined = undefined,
    client?: ClientInfo
  ): Promise<DatasetDao> {
    const catalog = await this.getCatalogDao();
    const exist = await this.datasetRepository.findOne({
      where: { id: dataset.id }
    });
    if (exist) {
      throw new DSPError(
        `The dataset with ${dataset.id} already exists.`,
        HttpStatus.CONFLICT
      ).andLog(this.logger, "warn");
    }
    if (!dataset.hasPolicy) {
      this.logger.log(
        `No policies found on dataset with id: ${dataset.id}. Creating a default one.`
      );
      if (this.defaultPolicy?.type === "manual") {
        if (!this.defaultPolicy.raw) {
          throw new DSPError(
            `Default policy type is manual but no raw ODRL offer is provided`,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
        const offer = await deserialize<Offer>(this.defaultPolicy.raw);
        dataset.hasPolicy = [offer];
      } else {
        const offer = new Offer({
          assigner:
            dataset.publisher ||
            dataset.creator ||
            catalog.data.publisher ||
            "",
          permission: this.defaultPolicy?.permissions?.map((permission) => {
            return new Permission({
              action: permission.action,
              target: dataset.id,
              constraint: permission.constraints?.map((constraint) =>
                this.constructConstraint(constraint)
              )
            });
          }),
          prohibition: this.defaultPolicy?.prohibitions?.map((prohibition) => {
            return new Prohibition({
              action: prohibition.action,
              target: dataset.id,
              constraint: prohibition.constraints?.map((constraint) =>
                this.constructConstraint(constraint)
              )
            });
          })
        });
        if (!offer.permission || offer.permission.length === 0) {
          offer.permission = [
            new Permission({
              action: ODRLAction.USE,
              target: dataset.id
            })
          ];
        }
        dataset.hasPolicy = [offer];
      }
    }

    dataset.hasPolicy.map((policy) => {
      if (!policy.assigner) {
        policy.assigner =
          dataset.publisher || dataset.creator || catalog.data.publisher || "";
      }
    });

    const newResource = this.resourceRepository.create(dataset);
    const newDataset = this.datasetRepository.create(dataset);
    // Set ownership fields
    Object.assign(newDataset, getOwnershipFieldsFromClient(client));
    newDataset._resource = newResource;
    newDataset._distribution = dataset.distribution?.map((distribution) => {
      if (typeof distribution.accessService === "string") {
        distribution.accessService = new DataService({
          id: distribution.accessService
        });
      }
      const distributionObj = this.distributionRepository.create(
        distribution as unknown as DistributionDao
      );
      if (distribution.accessService) {
        if (
          distribution.accessService.endpointDescription ===
            "dspace:connector" &&
          catalog.data?._services?.[0]
        ) {
          distributionObj._accessService = catalog.data?._services?.[0];
        } else {
          const resourceObj = this.resourceRepository.create({
            id: distribution.accessService.id
          });
          const serviceObj = this.dataservicesRepository.create(
            distribution.accessService
          );
          serviceObj._resource = resourceObj;
          distributionObj._accessService = serviceObj;
        }
      } else {
        distributionObj._accessService = catalog.data?._services?.[0];
      }
      return distributionObj;
    });
    newDataset._catalog = catalog.data;
    newDataset._dataPlane = dataPlaneDao;
    await this.datasetRepository.save(newDataset);
    this.logger.debug(`Added dataset ${dataset.id}`);
    return newDataset;
  }

  async updateDataset(
    datasetId: string,
    dataset: Dataset,
    dataPlaneDao: DataPlaneDao | undefined = undefined
  ): Promise<DatasetDao> {
    const existingDataset = await this.datasetRepository.findOne({
      where: {
        id: datasetId
      },
      relations: {
        _dataPlane: true,
        _resource: true,
        _distribution: {
          _accessService: {
            _resource: true
          }
        }
      }
    });
    if (!existingDataset) {
      throw new DSPError(
        `Can't update a dataset, as dataset with id ${datasetId} does not exist yet`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    if (dataPlaneDao && existingDataset._dataPlane?.id !== dataPlaneDao.id) {
      throw new DSPError(
        `Can't update a dataset, as dataset with id ${datasetId} is not associated with the data plane with id ${dataPlaneDao.id}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    const newResource = this.resourceRepository.create(dataset);
    const catalog = await this.getCatalogDao();
    this.logger.debug(`Updated dataset ${datasetId}`);
    return await this.datasetRepository.save(
      this.datasetRepository.create({
        ...dataset,
        _resource: newResource,
        _distribution: dataset.distribution?.map((distribution) => {
          const { accessService, ...distributionRemainder } = distribution;
          let accessServiceDao: DeepPartial<DataServiceDao | undefined>;
          if (typeof accessService === "string") {
            accessServiceDao = this.dataservicesRepository.create({
              _resource: this.resourceRepository.create({
                id: accessService
              })
            });
          } else if (accessService) {
            if (
              accessService.endpointDescription === "dspace:connector" &&
              catalog.data?._services?.[0]
            ) {
              accessServiceDao = catalog.data?._services?.[0];
            } else {
              accessServiceDao = this.dataservicesRepository.create({
                ...accessService,
                _resource: this.resourceRepository.create({
                  id: accessService.id
                })
              });
            }
          } else {
            accessServiceDao = catalog.data?._services?.[0];
          }
          return this.distributionRepository.create({
            ...distributionRemainder,
            _accessService: accessServiceDao
          });
        })
      })
    );
  }

  async removeDataset(datasetId: string): Promise<void> {
    const dataset = await this.datasetRepository.findOneBy({ id: datasetId });
    if (!dataset) {
      throw new DSPError(
        `Could not find dataset with id ${datasetId}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    await this.datasetRepository.remove(dataset);
  }

  async request(
    requestMessage: CatalogRequestMessage,
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CatalogDto>> {
    requestMessage.filter?.forEach((filter) => {
      this.logger.warn(
        `Filter ${filter} is not supported in the catalog request. Ignoring it.`
      );
    });
    const catalog = await this.getCatalogDao(paginationOptions);
    return {
      data: new Catalog(catalog.data).serialize(),
      total: catalog.total
    };
  }

  async getDataplaneDatasets(
    dataPlaneId: string,
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<DatasetDto[]>> {
    const [datasets, itemCount] = await this.datasetRepository.findAndCount({
      where: {
        _dataPlane: {
          id: dataPlaneId
        }
      },
      relations: {
        _resource: true,
        _distribution: {
          _accessService: {
            _resource: true
          }
        }
      },
      ...paginationOptions.typeOrm
    });
    return {
      data: datasets.map((dataset) => new Dataset(dataset).serialize()),
      total: itemCount
    };
  }

  async getDataset(datasetId: string): Promise<Dataset> {
    const dataset = await this.datasetRepository.findOne({
      where: {
        id: datasetId
      },
      relations: {
        _resource: true,
        _distribution: {
          _accessService: {
            _resource: true
          }
        }
      }
    });
    if (!dataset) {
      throw new DSPError(
        `Could not find dataset with id ${datasetId}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    } else {
      return new Dataset(dataset);
    }
  }

  async getDatasetDto(
    datasetId: string
  ): Promise<DatasetDto | CatalogErrorDto> {
    try {
      const dataset = await this.getDataset(datasetId);
      return dataset.serialize();
    } catch (error) {
      if (error instanceof AppError) {
        return new CatalogError({
          code: error.getStatus().toString(),
          reason: [error.message]
        }).serialize();
      } else {
        return new CatalogError({
          code: "500",
          reason: ["Internal server error"]
        }).serialize();
      }
    }
  }
}
