import { ConflictException, HttpStatus, Injectable, Optional } from "@nestjs/common";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import {
  Catalog,
  DataService,
  Dataset,
  Resource,
} from "../../model/dsp/catalog/catalog";
import { InitCatalog, ServerConfig } from "../../config";
import { Multilanguage, Reference } from "../../model/dsp/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CatalogDao, DataServiceDao, DatasetDao, DistributionDao, ResourceDao } from "../../model/dsp/catalog/catalog.dao";
import { DSPError } from "../../utils/errors/error";

@Injectable()
export class CatalogService {
  constructor(
      @InjectRepository(CatalogDao) private readonly catalogRepository: Repository<CatalogDao>,
      @InjectRepository(DatasetDao) private readonly datasetRepository: Repository<DatasetDao>,
      @InjectRepository(DataServiceDao) private readonly dataservicesRepository: Repository<DataServiceDao>,
      @InjectRepository(DistributionDao) private readonly distributionRepository: Repository<DistributionDao>,
      @InjectRepository(ResourceDao) private readonly resourceRepository: Repository<ResourceDao>,
      @Optional() private readonly initCatalog?: InitCatalog, 
      @Optional() private readonly server?: ServerConfig) {
  }
  initialized = this.initalizeCatalog();

  async getCatalogDao(relations?: boolean): Promise<CatalogDao> {
    let catalog;
    if ( relations ) {
      catalog = await this.catalogRepository.find({
        relations:
        {
          _datasets: {
            _resource: true,
            _distribution: {
              _accessService: {
                _resource: true
              },
            }
          },
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
    } else {
      catalog = await this.catalogRepository.find({});
    }
    
    if (!catalog[0]) {
      throw new DSPError("Catalog not (yet) available", HttpStatus.NOT_FOUND)
    }
    return catalog[0];
  }

  async initalizeCatalog() {
    const existingCatalog = await this.catalogRepository.find({});
    if (!existingCatalog[0] && this.initCatalog && this.server) {
      const resource = this.resourceRepository.create(new Resource({
        creator: new Reference(this.initCatalog.creator),
        publisher: this.initCatalog.publisher,
        title: this.initCatalog.title,
        description: [new Multilanguage(this.initCatalog.description)],
      }))
      const dataset = this.datasetRepository.create({...new Dataset({
        id: resource.id
      }),
        _resource: resource
      })
      const dservice = new DataService({
        endpointDescription: new Reference('dpsace:connector'),
        conformsTo: new Reference('dpsace:connector'),
        endpointURL: `${this.server.publicAddress}`,
      })
      this.dataservicesRepository.create({
        ...dservice
      });
      const catalog = this.catalogRepository.create(new Catalog({
        id: dataset.id
      }))
      catalog._services = [dservice]
      catalog._dataset = await this.datasetRepository.save(dataset);
      
      return this.catalogRepository.save(
        catalog);
    } 
    
    
  }

  async modifyCatalog(catalog: CatalogDao): Promise<void> {
    await this.catalogRepository.update({id: catalog.id}, catalog)
  }

  async addDataset(dataset: Dataset): Promise<DatasetDao | undefined> {
    const catalog = await this.getCatalogDao(true);
    const exist = await this.datasetRepository.findOne({where: {id: dataset.id}})
    if (exist) {
      throw new ConflictException(
        `The dataset with ${dataset.id} already exists.`,
        HttpStatus.CONFLICT.toString(),
      );
    }
    const newResource = this.resourceRepository.create(dataset)
    const newDataset = this.datasetRepository.create(dataset)
    newDataset._resource = newResource
    newDataset._distribution = dataset.distribution?.map(distribution => {
      const distributionObj = this.distributionRepository.create(distribution);
      distributionObj._accessService = distribution.accessService?.map(service => {
        const resourceObj = this.resourceRepository.create({id: service.id});
        const serviceObj = this.dataservicesRepository.create(service);
        serviceObj._resource = resourceObj;
        return serviceObj
      });
      return distributionObj;
    })
    catalog._datasets?.push(newDataset)
    await this.catalogRepository.save(catalog)
    return newDataset
  }

  async updateDataset(datasetId: string, dataset: Dataset): Promise<DatasetDao | null> {
    const existingDataset = await this.datasetRepository.findOneBy({id: datasetId});
    if (!existingDataset) {
      throw new DSPError(`Can't update a dataset, as dataset with id ${datasetId} does not exist yet`, HttpStatus.NOT_FOUND)
    }
    const newResource = this.resourceRepository.create(dataset)
    return await this.datasetRepository.save({
      ...dataset,
      _resource: newResource,
      _distribution: dataset.distribution?.map(distribution => {
        return this.distributionRepository.create({
          ...distribution,
          _accessService: distribution.accessService?.map(service => {
            return this.dataservicesRepository.create({
              ...service,
              _resource: this.resourceRepository.create({id: service.id})
            })
          })
        })
      })
    });
  }

  async removeDataset(datasetId: string): Promise<void> {
    await this.datasetRepository.delete({id: datasetId});
  }

  async request(requestMessage: CatalogRequestMessage): Promise<Catalog> {
    requestMessage.filter?.forEach((filter) => {
      console.log(filter);
    });
    const catalog = await this.getCatalogDao(true);
    return new Catalog(catalog);
  }

  async getDataset(datasetId: string): Promise<Dataset | undefined> {
    const dataset = await this.datasetRepository.findOne({
      where: {
        id: datasetId
      },
      relations: {
        _resource: true,
        _distribution: {
          _accessService: {
            _resource: true
          },
        }
      }
    });
    if (!dataset) {
      return undefined;
    } else {
      return new Dataset(dataset);
    }
  }
}
