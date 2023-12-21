import { HttpStatus, Injectable, Optional } from "@nestjs/common";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import {
  Catalog,
  DataService,
  Dataset,
} from "../../model/dsp/catalog/catalog";
import { InitCatalog, ServerConfig } from "../../config";
import { Multilanguage, Reference } from "../../model/dsp/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CatalogDao, DatasetDao } from "../../model/dsp/catalog/catalog.dao";
import { DSPError } from "../../utils/errors/error";
import { DatasetDto } from "../../model/dsp/catalog/catalog.dto";

@Injectable()
export class CatalogService {
  constructor(
      @InjectRepository(CatalogDao) private readonly catalogRepository: Repository<CatalogDao>,
      @InjectRepository(DatasetDao) private readonly datasetRepository: Repository<DatasetDao>,
      @Optional() private readonly initCatalog?: InitCatalog, 
      @Optional() private readonly server?: ServerConfig) {
    this.initalizeCatalog()
  }

  // private catalog: Catalog | undefined;
  // private datasets: Dataset[] = [];

  async getCatalogDao(): Promise<CatalogDao> {
    const catalog = await this.catalogRepository.find({});
    if (!catalog[0]) {
      throw new DSPError("Catalog not (yet) available", HttpStatus.NOT_FOUND)
    }
    return catalog[0];
  }

  async initalizeCatalog() {
    const existingCatalog = await this.catalogRepository.find({});
    if (!existingCatalog[0] && this.initCatalog && this.server) {
      const dataServices = new DataService({
        endpointDescription: new Reference('dpsace:connector'),
        conformsTo: new Reference('dpsace:connector'),
        endpointURL: `${this.server.publicAddress}`,
      });
      this.catalogRepository.save({
        ...new Catalog({
          creator: new Reference(this.initCatalog.creator),
          publisher: this.initCatalog.publisher,
          title: this.initCatalog.title,
          description: [new Multilanguage(this.initCatalog.description)],
          service: [dataServices]
        }),
        _service: [dataServices]
      });
    } 
  }

  async modifyCatalog(catalog: Catalog): Promise<void> {
    this.catalogRepository.update({}, catalog)
    // this.catalog = catalog;

    const dataset: DatasetDto = {
      '@type': 'dcat:Dataset',
      '@id': "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
      'dct:title': 'Test HTTP dataset',
      "dcat:distribution": [
        {
          '@id': "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
          '@type': 'dcat:Distribution',
          'dct:format': "dspace:HTTP",
          'dcat:accessService': [
            {
              '@type': 'dcat:DataService',
              '@id': "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
              'dcat:endpointURL': "https://httpbin.org/anything"
            }
          ]
        }
      ]
    }

  }

  async addDataset(dataset: Dataset): Promise<void> {
    const catalog = await this.getCatalogDao();
    this.datasetRepository.insert({
      ...dataset,
      _catalog: catalog
    })
    // this.datasets.push(dataset);
  }

  async updateDataset(datasetId: string, dataset: Dataset): Promise<void> {
    const catalog = await this.getCatalogDao();
    const existingDataset = await this.datasetRepository.findOneBy({id: datasetId});
    if (!existingDataset) {
      throw new DSPError(`Can't update a dataset, as dataset with id ${datasetId} does not exist yet`, HttpStatus.NOT_FOUND)
    }
    this.datasetRepository.update({id: datasetId}, {
      ...dataset,
      _catalog: catalog
    })
    // await this.removeDataset(datasetId);
    // await this.addDataset(dataset);
  }

  async removeDataset(datasetId: string): Promise<void> {
    await this.datasetRepository.delete({id: datasetId});
    // this.datasets = this.datasets.filter(dataset => dataset.id !== datasetId);
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
      return new Dataset(dataset)
    }
    // return this.datasets.find((dataset) => dataset.id === datasetId);
  }
}
