import { ConflictException, HttpStatus, Injectable, Optional } from "@nestjs/common";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import {
  Catalog,
  DataService,
  Dataset,
  Distribution,
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
    this.initalizeCatalog()
  }

  // private catalog: Catalog | undefined;
  // private datasets: Dataset[] = [];

  async getCatalogDao(relations?: boolean): Promise<CatalogDao> {
    let catalog;
    if ( relations ) {
      catalog = await this.catalogRepository.find({relations: {
        _datasets: true,
        _services: true
      }});
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
      const dataset = this.datasetRepository.create({...new Dataset({}),
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
      const catalog = this.catalogRepository.create(new Catalog({}))
      catalog._services = [dservice]
      catalog._dataset = dataset
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
    newDataset._resource=newResource
    const distributions: Array<Distribution> | undefined = dataset.distribution
    if (distributions !== undefined) {
      const distributionArray: DistributionDao[] = []
      distributions.forEach((distribution: Distribution) => {
        const distributionObj = this.distributionRepository.create(distribution)
        const services: Array<DataService> | undefined = distribution.accessService
        if (services !== undefined) {
          const servicesArray: DataServiceDao[] = []
          services.forEach((service: DataService) => {
            const resourceObj = this.resourceRepository.create({id: service.id})
            const serviceObj = this.dataservicesRepository.create(service)
            serviceObj._resource = resourceObj
            servicesArray.push(serviceObj)
          })
          distributionObj._accessService = servicesArray
        }
        distributionArray.push(distributionObj)
      })
      newDataset._distribution = distributionArray
    }
    catalog._datasets?.push(newDataset)
    await this.catalogRepository.save(catalog)
    return newDataset
  }

  async updateDataset(datasetId: string, dataset: Dataset): Promise<DatasetDao | null> {
    const existingDataset = await this.datasetRepository.findOneBy({id: datasetId});
    if (!existingDataset) {
      throw new DSPError(`Can't update a dataset, as dataset with id ${datasetId} does not exist yet`, HttpStatus.NOT_FOUND)
    }
    await this.resourceRepository
      .createQueryBuilder()
      .update(ResourceDao)
      .set({
        id: dataset.id,
        contactPoint: dataset.contactPoint,
        keyword: dataset.keyword,
        landingPage: dataset.landingPage,
        theme: dataset.theme,
        conformsTo: dataset.conformsTo,
        creator: dataset.creator,
        description: dataset.description,
        identifier: dataset.identifier,
        isReferencedBy: dataset.isReferencedBy,
        issued: dataset.issued,
        language: dataset.language,
        license: dataset.license,
        modified: dataset.modified,
        publisher: dataset.publisher,
        relation: dataset.relation,
        title: dataset.title,
        type: dataset.type,
        hasPolicy: dataset.hasPolicy,
      })
      .where("id = :id", {id: existingDataset!._resource!.id})
      .execute();
    await this.datasetRepository
      .createQueryBuilder()
      .update(DatasetDao)
      .set({
        spatialResolutionInMeters: dataset.spatialResolutionInMeters,
        temporalResolution: dataset.temporalResolution,
        accrualPeriodicity: dataset.accrualPeriodicity,
        spatial: dataset.spatial,
        temporal: dataset.temporal,
        wasGeneratedBy: dataset.wasGeneratedBy
      })
      .where("_id = :_id", {_id: existingDataset._id})
      .execute();    
    return await this.datasetRepository.findOneBy({_id: existingDataset._id})
  }

  async removeDataset(datasetId: string): Promise<void> {
    await this.datasetRepository.delete({id: datasetId});
  }

  async request(requestMessage: CatalogRequestMessage): Promise<Catalog> {
    requestMessage.filter?.forEach((filter) => {
      console.log(filter);
    });
    const catalog = await this.getCatalogDao();
    return new Catalog(catalog);
  }

  async getDataset(datasetId: string): Promise<Dataset | undefined> {
    const dataset = await this.datasetRepository.findOneBy({id: datasetId});
    if (!dataset) {
      return undefined;
    } else {
      const resource = dataset._resource!
      return new Dataset({
        id: dataset.id,
        contactPoint: resource.contactPoint,
        keyword: resource.keyword,
        landingPage: resource.landingPage,
        theme: resource.theme,
        conformsTo: resource.conformsTo,
        creator: resource.creator,
        description: resource.description,
        identifier: resource.identifier,
        isReferencedBy: resource.isReferencedBy,
        issued: resource.issued,
        language: resource.language,
        license: resource.license,
        modified: resource.modified,
        publisher: resource.publisher,
        relation: resource.relation,
        title: resource.title,
        type: resource.type,
        hasPolicy: resource.hasPolicy,
        distribution: dataset.distribution,
        spatialResolutionInMeters: dataset.spatialResolutionInMeters,
        temporalResolution: dataset.temporalResolution,
        accrualPeriodicity: dataset.accrualPeriodicity,
        spatial: dataset.spatial,
        temporal: dataset.temporal,
        wasGeneratedBy: dataset.wasGeneratedBy,
      })
    }
  }
}
